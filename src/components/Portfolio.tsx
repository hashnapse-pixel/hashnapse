import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Vote, ShieldCheck, User } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { Character, UserAsset, UserVote } from '../services/dataService';
import { useAlert } from './AlertContext';

interface PortfolioProps {
  currentRoomId: string;
  asset: UserAsset;
  characters: Character[];
  onNavigateToMarket: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ currentRoomId, asset, characters, onNavigateToMarket }) => {
  const { showAlert, showToast } = useAlert();
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [nickname, setNickname] = useState('');
  const [isUpdatingNick, setIsUpdatingNick] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      setIsLoading(true);
      const userVotes = await dataService.getUserVotes(currentRoomId);
      // 통합 거래소이므로 전체 투표 목록 적용
      setVotes(userVotes);
      
      const currentNick = await dataService.getUserNickname();
      setNickname(currentNick);
      setIsLoading(false);
    };
    fetchVotes();
  }, [currentRoomId, asset, characters]);

  const handleNicknameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      showToast('닉네임을 입력해주세요.', 'error');
      return;
    }
    setIsUpdatingNick(true);
    try {
      await dataService.saveUserNickname(nickname.trim());
      showToast('닉네임이 성공적으로 변경되었습니다.', 'success');
    } catch (err: any) {
      showAlert(err.message || '닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingNick(false);
    }
  };

  // Calculations
  const totalVotesCount = votes.reduce((sum, item) => sum + item.votedQuantity, 0);
  const grandTotalVotes = totalVotesCount + asset.availableVotes;

  // Enriched votes list
  const enrichedVotes = votes.map(vote => {
    const character = characters.find(c => c.id === vote.characterId);
    return {
      ...vote,
      character
    };
  });

  return (
    <div>
      <div className="app-header">
        <span>내 포트폴리오</span>
      </div>

      {/* Asset Scoreboard - Pure Vote representation */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(31, 45, 68, 0.4) 100%)', padding: '24px 20px' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>내 총 자산 평가액 (Portfolio Value)</div>
        <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'white', marginTop: '4px', marginBottom: '16px' }}>
          {grandTotalVotes.toLocaleString()} <span style={{ fontSize: '1.2rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>P</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Vote size={13} className="text-warning" /> 매수 완료 금액
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-warning)' }}>
              {totalVotesCount} P
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <ShieldCheck size={13} className="text-success" /> 보유 포인트
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px', color: 'var(--color-success)' }}>
              {asset.availableVotes} P
            </div>
          </div>
        </div>
      </div>

      {/* 내 프로필 설정 (닉네임 관리) */}
      <form onSubmit={handleNicknameSave} className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          <User size={14} className="text-primary" /> 내 프로필 설정
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="사용할 닉네임을 적어보세요"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={15}
            style={{ margin: 0, padding: '10px 12px', fontSize: '0.85rem' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isUpdatingNick}
            style={{ width: 'auto', padding: '10px 18px', fontSize: '0.85rem', flexShrink: 0 }}
          >
            {isUpdatingNick ? '변경 중...' : '저장'}
          </button>
        </div>
      </form>

      {/* Holdings List Header */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        보유 캐릭터 목록 ({votes.length})
      </h3>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>데이터 로드 중...</div>
      ) : votes.length === 0 ? (
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            아직 보유 중인 캐릭터가 없습니다. 무료 포인트를 충전하고 캐릭터 거래를 시작해보세요!
          </p>
          <button className="btn btn-primary" onClick={onNavigateToMarket}>
            캐릭터 거래소 가기 <ArrowUpRight size={18} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {enrichedVotes.map(item => {
            if (!item.character) return null;
            return (
              <div key={item.characterId} className="card" style={{ padding: '16px', margin: 0 }}>
                <div className="flex-between" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={item.character.imageUrl} 
                      alt={item.character.name} 
                      style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{item.character.name} (${item.character.group?.toUpperCase()})</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        시가총액: {item.character.votes} P
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      포트폴리오 비중
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {item.character.votes > 0 
                        ? ((item.votedQuantity / item.character.votes) * 100).toFixed(1) 
                        : '0.0'}% <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>({item.votedQuantity} P)</span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.15)', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)'
                }}>
                  <div>
                    <span>내가 보유한 수량:</span>
                    <strong style={{ color: 'var(--color-warning)', marginLeft: '6px', fontSize: '0.85rem' }}>{item.votedQuantity} P</strong>
                  </div>
                  <button 
                    onClick={onNavigateToMarket}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--color-primary)', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    추가 매수 / 매도 <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
