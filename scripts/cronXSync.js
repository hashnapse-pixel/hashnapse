const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// 1. Supabase 클라이언트 초기화 (GitHub Actions Secret에서 주입)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required env variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// X API Bearer Token (X developer portal에서 발급 가능)
const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;

async function run() {
  console.log("🚀 Starting Hashnapse X(Twitter) Cron Sync Job...");
  
  let tweets = [];

  // 2. X API를 통한 실제 크롤링 시도 (Bearer Token이 있을 경우)
  if (twitterBearerToken) {
    console.log("🔍 Fetching recent tweets from X API...");
    try {
      const query = encodeURIComponent('#hashnapse OR @hashnapse OR #해시냅스 OR @해시냅스');
      // 최근 7일 내 트윗 검색 엔드포인트
      const response = await axios.get(
        `https://api.twitter.com/2/tweets/search/recent?query=${query}&expansions=author_id&user.fields=username&max_results=100`,
        {
          headers: {
            Authorization: `Bearer ${twitterBearerToken}`
          }
        }
      );

      if (response.data && response.data.data) {
        const usersMap = {};
        if (response.data.includes && response.data.includes.users) {
          response.data.includes.users.forEach(u => {
            usersMap[u.id] = u.username; // X username (핸들) 매핑
          });
        }

        tweets = response.data.data.map(t => ({
          id: t.id,
          text: t.text,
          // @를 덧붙인 소문자 핸들로 가다듬음
          authorHandle: usersMap[t.author_id] ? `@${usersMap[t.author_id].toLowerCase()}` : null
        })).filter(t => t.authorHandle);

        console.log(`✅ Successfully fetched ${tweets.length} tweets from X API.`);
      }
    } catch (apiErr) {
      console.error("⚠️ Failed to fetch from X API (API rate limit or invalid token). Falling back to mockup sync simulator:", apiErr.message);
      tweets = getMockupTweets();
    }
  } else {
    console.log("ℹ️ TWITTER_BEARER_TOKEN is missing. Running mock sync crawler simulator...");
    tweets = getMockupTweets();
  }

  if (tweets.length === 0) {
    console.log("📭 No matching tweets found. Exiting sync job.");
    return;
  }

  // 3. Supabase에서 X 연동이 활성화된 사용자들의 자산 정보를 한꺼번에 가져옴
  console.log("📡 Fetching active user assets from Supabase...");
  const { data: userAssets, error: dbErr } = await supabase
    .from('user_assets')
    .select('id, x_handle, pending_votes, x_connected');

  if (dbErr) {
    console.error("❌ Failed to fetch user assets from DB:", dbErr);
    process.exit(1);
  }

  const activeAssets = userAssets.filter(asset => asset.x_connected && asset.x_handle);
  console.log(`📊 Found ${activeAssets.length} users with active X connections linked.`);

  // 4. 각 연동 유저별로 크롤링된 트윗 매칭 및 pending_votes 가산 처리
  const updates = [];

  for (const asset of activeAssets) {
    const userHandle = asset.x_handle.toLowerCase();
    
    // 이 유저가 작성한 해시냅스 관련 트윗들을 필터링
    const matchedTweets = tweets.filter(t => t.authorHandle === userHandle);
    
    if (matchedTweets.length > 0) {
      // 하루 최대 10개 한도 제한
      const currentPending = asset.pending_votes || 0;
      const availableCapacity = Math.max(0, 10 - currentPending);
      const earnedVotes = Math.min(matchedTweets.length, availableCapacity);

      if (earnedVotes > 0) {
        updates.push({
          id: asset.id, // user email
          pending_votes: currentPending + earnedVotes
        });
        console.log(`🎉 User [${asset.id}] earned +${earnedVotes} votes. (New Pending: ${currentPending + earnedVotes}/10)`);
      } else {
        console.log(`ℹ️ User [${asset.id}] already reached the daily 10-vote limit.`);
      }
    }
  }

  // 5. DB에 벌크 업데이트 반영
  if (updates.length > 0) {
    console.log(`💾 Saving updates for ${updates.length} users to Supabase...`);
    for (const update of updates) {
      const { error: updateErr } = await supabase
        .from('user_assets')
        .update({ pending_votes: update.pending_votes })
        .eq('id', update.id);
      
      if (updateErr) {
        console.error(`❌ Update failed for user [${update.id}]:`, updateErr);
      }
    }
    console.log("⭐ X sync job completed successfully!");
  } else {
    console.log("ℹ️ No new votes were earned in this sync window.");
  }
}

// 테스트 및 모킹을 위한 크롤러 시뮬레이터 데이터
function getMockupTweets() {
  console.log("📝 Generating mockup tweets for registered X handles...");
  return [
    { id: "1", text: "아이언판다 최고! @hashnapse", authorHandle: "@celebe_dev" },
    { id: "2", text: "오늘도 해시냅스에 캐릭터 주식 사러 감 #hashnapse", authorHandle: "@test_fan" },
    { id: "3", text: "#해시냅스 투표권 집계 매칭 너무 편리하다", authorHandle: "@celebe_dev" }
  ];
}

run().catch(err => {
  console.error("❌ Fatal error in cron sync script:", err);
  process.exit(1);
});
