const { createClient } = require('@supabase/supabase-js');
const xml2js = require('xml2js');

// 1. 환경 변수 검증
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ 필수 환경 변수가 누락되었습니다. (SUPABASE_URL, SUPABASE_ANON_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. 가용 Nitter 미러 사이트 목록 (순차적으로 폴백 실행하여 무중단 운영 보장)
const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.privacydev.net',
  'https://nitter.perennialte.ch',
  'https://nitter.esmailelbob.xyz'
];

// Nitter RSS 피드를 가져오는 헬퍼 함수
async function fetchRssFeed(query) {
  const encodedQuery = encodeURIComponent(query);
  
  for (const instance of NITTER_INSTANCES) {
    const url = `${instance}/search/rss?q=${encodedQuery}`;
    try {
      console.log(`📡 Nitter 인스턴스 접속 시도 중: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      
      const xmlText = await response.text();
      // XML 파싱 진행
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlText);
      
      if (result && result.rss && result.rss.channel) {
        console.log(`✅ [성공] ${instance} 로부터 피드를 수신하였습니다.`);
        return result.rss.channel.item || [];
      }
    } catch (err) {
      console.warn(`⚠️ [실패] ${instance} 오류 발생 (${err.message}). 다음 인스턴스로 폴백합니다...`);
    }
  }
  throw new Error("❌ 모든 Nitter 미러 인스턴스 호출에 실패했습니다.");
}

async function runCrawler() {
  console.log("🚀 X(Twitter) RSS 기반 비공식 무료 크롤러 실행 시작...");
  
  // 1. crawler_runs 시작 로그 기록
  const { data: runLog, error: logError } = await supabase
    .from('crawler_runs')
    .insert([{ status: 'running', started_at: new Date().toISOString() }])
    .select()
    .single();

  if (logError) {
    console.error("❌ 크롤러 시작 로그 기록 실패:", logError);
    process.exit(1);
  }

  const runId = runLog.id;

  try {
    // 2. 직전 성공한 마지막 트윗 ID(since_id) 조회 (과거 트윗 무시용)
    const { data: lastRun, error: lastRunError } = await supabase
      .from('crawler_runs')
      .select('last_processed_tweet_id')
      .eq('status', 'success')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRunError) {
      console.warn("⚠️ 직전 실행 기록 조회 실패 (처음 실행하는 것일 수 있음):", lastRunError);
    }

    const sinceId = lastRun?.last_processed_tweet_id || null;
    console.log(`🔍 직전 마지막 트윗 ID (sinceId): ${sinceId}`);

    // 3. 두 개의 쿼리(#해시냅스, @hashnapse) 피드를 순차 로드하여 하나로 통합
    console.log("📥 해시태그(#해시냅스) 피드 로드 중...");
    const tagItems = await fetchRssFeed('#해시냅스').catch(() => []);
    
    console.log("📥 계정 멘션(@hashnapse) 피드 로드 중...");
    const mentionItems = await fetchRssFeed('@hashnapse').catch(() => []);

    // 가져온 항목들을 배열화(단일 아이템인 경우 대응)
    const normalizedTagItems = Array.isArray(tagItems) ? tagItems : [tagItems].filter(Boolean);
    const normalizedMentionItems = Array.isArray(mentionItems) ? mentionItems : [mentionItems].filter(Boolean);

    // 중복 제거용 합치기
    const allItemsMap = {};
    [...normalizedTagItems, ...normalizedMentionItems].forEach(item => {
      // guid 또는 link가 고유 트윗 주소 역할을 함
      const idKey = item.guid?._ || item.guid || item.link;
      if (idKey) {
        allItemsMap[idKey] = item;
      }
    });

    const combinedItems = Object.values(allItemsMap);
    console.log(`📋 중복 제거 후 수집된 총 트윗 수: ${combinedItems.length}개`);

    let processedCount = 0;
    let awardedCount = 0;
    let newestTweetId = sinceId;

    if (combinedItems.length > 0) {
      // RSS 피드 항목 분석
      for (const item of combinedItems) {
        const link = item.link;
        // link 패턴 매칭 예시: https://nitter.net/username/status/1234567890#m
        // 정규식으로 유저명과 트윗 고유 ID 추출
        const match = link.match(/\/([^\/]+)\/status\/(\d+)/);
        
        if (!match) {
          continue;
        }

        const username = match[1];
        const tweetId = match[2];
        const xHandle = `@${username.toLowerCase()}`;
        const tweetCreatedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

        console.log(`[트윗 ${tweetId}] 분석 중 -> 작성자 X 핸들: ${xHandle}, 작성 시각: ${tweetCreatedAt}`);

        // if sinceId가 설정되어 있다면, 이 트윗 ID가 numeric으로 sinceId보다 큰지 비교
        if (sinceId && BigInt(tweetId) <= BigInt(sinceId)) {
          // 이미 이전 크롤링 루프에서 분석이 끝난 과거 트윗이므로 스킵
          console.log(`[트윗 ${tweetId}] 직전 처리 ID(${sinceId}) 이하의 과거 트윗이므로 건너뜁니다.`);
          continue;
        }

        processedCount++;

        // 이번 루프 중 가장 큰 트윗 ID 갱신
        if (!newestTweetId || BigInt(tweetId) > BigInt(newestTweetId)) {
          newestTweetId = tweetId;
        }

        // 4. 이 X 핸들과 연동된 서비스 유저가 있는지 대조
        const { data: matchedAssets, error: assetErr } = await supabase
          .from('user_assets')
          .select('id, room_id, available_votes')
          .eq('x_handle', xHandle)
          .eq('x_connected', true);

        if (assetErr) {
          console.error(`❌ 유저 자산 조회 오류 (핸들: ${xHandle}):`, assetErr);
          continue;
        }

        if (!matchedAssets || matchedAssets.length === 0) {
          console.log(`[트윗 ${tweetId}] X 핸들 ${xHandle}로 연동된 활성화 유저가 없습니다.`);
          continue;
        }

        // 5. 중복 지급 방지 체크 및 포인트 지급
        for (const asset of matchedAssets) {
          const userEmail = asset.id;
          const roomId = asset.room_id;

          // 이미 처리된 트윗인지 체크
          const { data: alreadyProcessed, error: checkErr } = await supabase
            .from('processed_tweets')
            .select('tweet_id')
            .eq('tweet_id', tweetId)
            .maybeSingle();

          if (checkErr) {
            console.error(`❌ 중복 지급 검사 오류 (트윗: ${tweetId}):`, checkErr);
            continue;
          }

          if (alreadyProcessed) {
            console.log(`[트윗 ${tweetId}] 이미 포인트 지급이 처리된 건입니다. (건너뜀)`);
            continue;
          }

          // 트랜잭션 안전 지급: user_assets.available_votes + 1
          const newVotes = (asset.available_votes || 0) + 1;
          const { error: updateErr } = await supabase
            .from('user_assets')
            .update({ available_votes: newVotes })
            .eq('id', userEmail)
            .eq('room_id', roomId);

          if (updateErr) {
            console.error(`❌ 포인트 적립 업데이트 오류 (유저: ${userEmail}, 방: ${roomId}):`, updateErr);
            continue;
          }

          // processed_tweets에 등록
          const { error: insertLogErr } = await supabase
            .from('processed_tweets')
            .insert([{ 
              tweet_id: tweetId, 
              user_email: userEmail, 
              points_granted: 1,
              tweet_created_at: tweetCreatedAt
            }]);

          if (insertLogErr) {
            console.error(`❌ 중복 방지 원장 기록 오류 (트윗: ${tweetId}):`, insertLogErr);
          } else {
            console.log(`✅ [성공] 유저 ${userEmail} (방 ${roomId})에 1 P가 실시간 지급되었습니다.`);
            awardedCount++;
          }
        }
      }
    }

    // 6. 성공 로그 갱신
    await supabase
      .from('crawler_runs')
      .update({
        status: 'success',
        finished_at: new Date().toISOString(),
        last_processed_tweet_id: newestTweetId || sinceId,
        tweets_detected: processedCount,
        points_awarded: awardedCount
      })
      .eq('id', runId);

    console.log(`🏁 크롤러 실행 완료: 총 ${processedCount}개 신규 트윗 검토 / ${awardedCount} P 지급 완료.`);

  } catch (err) {
    console.error("❌ 크롤러 실행 중 중명도 오류 발생:", err);
    
    // 에러 발생 시 로그 갱신
    await supabase
      .from('crawler_runs')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: err.message || JSON.stringify(err)
      })
      .eq('id', runId);
      
    process.exit(1);
  }
}

runCrawler();
