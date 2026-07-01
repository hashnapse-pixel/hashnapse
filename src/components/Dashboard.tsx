import React, { useState, useEffect } from 'react';
import { Ticket, Sparkles, Play, Tv } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { UserAsset } from '../services/dataService';
import { useAlert } from './AlertContext';

interface DashboardProps {
  currentRoomId: string;
  asset: UserAsset;
  onUpdateAsset: (newAsset: UserAsset) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ currentRoomId, asset, onUpdateAsset }) => {
  const { showAlert, showToast } = useAlert();
  const userEmail = localStorage.getItem('user_email');

  const getXAccount = (email: string | null) => {
    if (!email) return '@user';
    const username = email.split('@')[0];
    const cleanName = username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `@${cleanName || 'user'}`;
  };

  // X(Twitter) Integration States
  const [xConnection, setXConnection] = useState<{ isConnected: boolean; xHandle: string }>({ isConnected: false, xHandle: '' });

  const [tweetVotesCount, setTweetVotesCount] = useState<{ count: number; maxLimit: number; nextResetTime?: string }>({ count: 0, maxLimit: 10 });


  // Ad Station States
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(3);

  // Initialize X connection data
  useEffect(() => {
    loadXData();
  }, [asset]);

  const loadXData = async () => {
    try {
      const conn = await dataService.getXConnectionStatus();
      setXConnection(conn);
      const votes = await dataService.getTodayTweetVotes();
      setTweetVotesCount(votes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    setAdCountdown(3);
  };

  useEffect(() => {
    let timer: any;
    if (isWatchingAd && adCountdown > 0) {
      timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
    } else if (isWatchingAd && adCountdown === 0) {
      completeAdWatching();
    }
    return () => clearTimeout(timer);
  }, [isWatchingAd, adCountdown]);

  const completeAdWatching = async () => {
    try {
      const updatedAsset = await dataService.claimAdReward(currentRoomId);
      onUpdateAsset(updatedAsset);
      setIsWatchingAd(false);
      showToast('📺 광고 시청 완료! 10 포인트가 지급되었습니다. 🎉', 'success');
    } catch (err: any) {
      showAlert(err.message || '광고 보상 지급 중 오류가 발생했습니다.');
      setIsWatchingAd(false);
    }
  };







  return (
    <div>
      <div className="app-header">
        <span>해시냅스 광장</span>
        <span style={{ fontSize: '0.8rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={16} className="text-warning" />
          X 해시태그 포스팅 = 1 P
        </span>
      </div>

      {/* 🌟 PREMIUM ASSET CARD - 보유 포인트 및 지급 예정 포인트 표시 */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(31, 45, 68, 0.4) 100%)', padding: '24px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* X(Twitter) Account Status Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e', animation: 'pulse 1.5s infinite' }} />
              X ACCOUNT CONNECTED
            </span>
            <span style={{ fontSize: '0.8rem', color: '#00f0ff', fontWeight: 900 }}>
              {getXAccount(userEmail)}
            </span>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '0.07em' }}>
              보유 포인트 (잔액)
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 900, 
              fontFamily: 'var(--font-display)', 
              color: 'white', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '10px',
              marginTop: '4px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
            }}>
              <Ticket size={32} className="text-warning" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 204, 0, 0.4))' }} />
              <span>{asset.availableVotes} <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>P</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* 📺 AD REWARD STATION - 광고 시청 즉시 충전 */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        padding: '24px 20px',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(168, 85, 247, 0.05)'
      }}>
        {/* Glow decoration */}
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          right: '-30px',
          width: '100px',
          height: '100px',
          background: 'rgba(168, 85, 247, 0.2)',
          filter: 'blur(25px)',
          borderRadius: '50%'
        }} />

        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
          <Tv size={20} className="text-primary-glow" style={{ color: '#a855f7' }} />
          무료 포인트 충전소 (Point Station)
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          📺 3초 광고를 시청하시면 모의 거래 및 캐릭터 거래에 사용할 수 있는 포인트 <strong style={{ color: '#a855f7' }}>10 P</strong>를 무제한으로 즉시 충전해 드립니다!
        </p>

        <button 
          onClick={handleWatchAd}
          className="btn btn-primary"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(168, 85, 247, 0.25)',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '12px'
          }}
        >
          <Play size={16} fill="currentColor" />
          포인트 10 P 수령하기
        </button>
      </div>

      {/* 🐦 X(Twitter) 자동 투표 연동 및 트윗 시뮬레이터 */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(29, 161, 242, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)', border: '1px solid rgba(29, 161, 242, 0.2)', padding: '24px 20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
          <span style={{ display: 'inline-flex', background: '#000', width: '24px', height: '24px', borderRadius: '50%', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 900 }}>X</span>
          X(Twitter) 포스팅 보상 적립기
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          💡 X 계정이 로그인 연동된 상태에서, x.com에 필수 해시태그(<strong style={{ color: 'white' }}>#해시냅스</strong>) 또는 계정 태그(<strong style={{ color: 'white' }}>@hashnapse</strong>)가 포함된 트윗을 작성하시면 10분 간격으로 작동하는 GitHub Action 크롤러가 이를 실시간 감지하여 글 1개당 <strong style={{ color: 'var(--color-warning)' }}>1 P</strong>를 내 지갑으로 즉시 자동 적립해 드립니다.
        </p>

        {/* 🐦 공식 X 계정 바로가기 외부 링크 버튼 */}
        <div style={{ marginBottom: '16px' }}>
          <a 
            href="https://x.com/hashnapse" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              fontSize: '0.8rem', 
              padding: '10px 14px', 
              textDecoration: 'none',
              background: 'rgba(29, 161, 242, 0.12)',
              border: '1px solid rgba(29, 161, 242, 0.25)',
              color: '#1da1f2',
              borderRadius: '10px',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
          >
            🐦 공식 X (@hashnapse) 바로가기
          </a>
        </div>

        <div>
          <div className="flex-between" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', display: 'block' }}>로그인 계정 연동 상태</span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--color-accent)' }}>{xConnection.xHandle || getXAccount(userEmail)}</strong>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 800 }}>자동 연동 완료</span>
          </div>

          {/* X Posting Guide Area */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              
              {/* 💡 트윗 작성 가이드 & 규칙 박스 */}
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                padding: '14px', 
                borderRadius: '12px', 
                fontSize: '0.75rem', 
                color: 'var(--color-text-secondary)', 
                marginBottom: '16px', 
                border: '1px solid rgba(255,255,255,0.05)', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                  📌 포인트(P) 보상 적립 규칙
                </strong>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <li>포스팅 내에 필수 해시태그(<strong style={{ color: 'var(--color-accent)' }}>#해시냅스</strong>) 또는 계정 멘션(<strong style={{ color: 'var(--color-accent)' }}>@hashnapse</strong>)이 포함되어 있어야 합니다.</li>
                  <li>X(Twitter)에 작성하신 포스팅을 감지하여 <strong style={{ color: 'var(--color-warning)' }}>1 P</strong>가 내 계정의 보유 포인트로 즉시 자동 적립됩니다.</li>
                  <li>GitHub Action을 통해 수시로 트윗을 크롤링하여 즉각 보상이 반영됩니다.</li>
                </ul>
              </div>

              {/* 실시간 오늘의 적립 현황 */}
              <div className="flex-between" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '10px', marginTop: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>오늘 감지된 X 포스팅 수</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-success)' }}>
                  {tweetVotesCount.count} P (트윗 {tweetVotesCount.count}개)
                </span>
              </div>
            </div>
          </div>
        </div>



      {/* 📺 Ad Watch Simulator Modal Overlay */}
      {isWatchingAd && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '400px',
            background: 'rgba(20, 24, 38, 0.98)',
            border: '2px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '24px',
            padding: '30px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(168, 85, 247, 0.2)',
            position: 'relative'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)',
              marginBottom: '20px',
              color: '#a855f7'
            }}>
              <Tv size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
             무료 포인트 수령 중... 🎬
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              잠시 후 1,000 P가 내 계정으로 지급됩니다.
            </p>

            {/* Video Player Simulator */}
            <div style={{
              width: '100%',
              height: '180px',
              background: '#090d16',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}>
              {/* Fake visual waves representing ad playing */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0,0,0,0) 80%)',
                animation: 'pulse 1.5s infinite alternate'
              }} />

              {/* Glowing countdown circle */}
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                border: '3px solid rgba(168, 85, 247, 0.2)',
                borderTopColor: '#a855f7',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '2rem',
                fontWeight: 900,
                color: 'white',
                animation: 'spinBorder 1s linear infinite',
                position: 'relative',
                zIndex: 2
              }}>
                <span style={{ animation: 'none' }}>{adCountdown}</span>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '16px', zIndex: 2, fontWeight: 600 }}>
                포인트 충전용 트래픽 활성화 중
              </span>

              {/* Progress bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #a855f7, #00f0ff)',
                width: `${((3 - adCountdown) / 3) * 100}%`,
                transition: 'width 1s linear'
              }} />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              ⚡ 완료되면 즉시 포인트가 지갑에 적립됩니다!
            </div>
          </div>
          <style>{`
            @keyframes pulse {
              from { opacity: 0.4; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
