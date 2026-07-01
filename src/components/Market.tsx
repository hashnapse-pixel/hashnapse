import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Ticket, X, Plus, Minus } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { Character, UserAsset, UserVote } from '../services/dataService';
import { useAlert } from './AlertContext';

interface MarketProps {
  currentRoomId: string;
  characters: Character[];
  asset: UserAsset;
  onUpdateAsset: (newAsset: UserAsset) => void;
  onRefreshCharacters: () => void;
}

type ModalType = 'vote' | 'unvote';

export const Market: React.FC<MarketProps> = ({ currentRoomId, characters, asset, onUpdateAsset, onRefreshCharacters }) => {
  const { showAlert } = useAlert();
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [modalType, setModalType] = useState<ModalType>('vote');
  const [actionQty, setActionQty] = useState<number>(1);
  const [userVotes, setUserVotes] = useState<UserVote[]>([]);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('전체');

  // Live transaction simulation feed
  const [liveTrades, setLiveTrades] = useState<Array<{
    id: string;
    wallet: string;
    ticker: string;
    amount: number;
    isBuy: boolean;
    timestamp: string;
  }>>([]);

  useEffect(() => {
    const tickers = ['SPARK', 'PANDA', 'GOLDD', 'ARTHUR', 'HARU', 'KAEL', 'LIA'];
    const nicknames = ['xprnetwork', 'alice', 'bob', 'charlie', 'dave', 'eva', 'frank', 'grace', 'henry', 'irene', 'jack'];
    
    const initialTrades = Array.from({ length: 4 }).map((_, idx) => {
      const isBuy = Math.random() > 0.4;
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const randomNick = nicknames[Math.floor(Math.random() * nicknames.length)];
      return {
        id: `trade-init-${idx}`,
        wallet: `@${randomNick}`,
        ticker,
        amount: Math.floor(Math.random() * 800) + 100,
        isBuy,
        timestamp: '방금 전'
      };
    });
    setLiveTrades(initialTrades);

    const interval = setInterval(() => {
      const isBuy = Math.random() > 0.45;
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const randomNick = nicknames[Math.floor(Math.random() * nicknames.length)];
      const newTrade = {
        id: `trade-${Date.now()}`,
        wallet: `@${randomNick}`,
        ticker,
        amount: Math.floor(Math.random() * 900) + 100,
        isBuy,
        timestamp: '방금 전'
      };

      setLiveTrades(prev => [newTrade, ...prev.slice(0, 3)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Load user votes to show on the cards
  const loadUserVotes = async () => {
    const votes = await dataService.getUserVotes(currentRoomId);
    // 통합 거래소이므로 전체 투표 목록 적용
    setUserVotes(votes);
  };

  useEffect(() => {
    loadUserVotes();
  }, [asset, characters]);

  // Auto popularity fluctuation every 7 seconds
  useEffect(() => {
    const timer = setInterval(async () => {
      await dataService.updateMarketPrices(currentRoomId);
      onRefreshCharacters();
    }, 7000);

    return () => clearInterval(timer);
  }, [currentRoomId, onRefreshCharacters]);

  const openActionModal = (char: Character, type: ModalType) => {
    setSelectedChar(char);
    setModalType(type);
    setActionQty(1);
  };

  const closeActionModal = () => {
    setSelectedChar(null);
  };

  const getVotedCount = (charId: string): number => {
    const v = userVotes.find(x => x.characterId === charId);
    return v ? v.votedQuantity : 0;
  };

  const executeAction = async () => {
    if (!selectedChar) return;

    let res: { success: boolean; message: string };

    if (modalType === 'vote') {
      res = await dataService.voteStock(currentRoomId, selectedChar.id, actionQty);
    } else {
      res = await dataService.unvoteStock(currentRoomId, selectedChar.id, actionQty);
    }

    await showAlert(res.message);
    if (res.success) {
      const updatedAsset = await dataService.getUserAsset(currentRoomId);
      onUpdateAsset(updatedAsset);
      onRefreshCharacters();
      await loadUserVotes();
      closeActionModal();
    }
  };

  const renderSparkline = (history: number[]) => {
    if (!history || history.length < 2) return null;
    const width = 140;
    const height = 44;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    const points = history.map((val, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const isUp = history[history.length - 1] >= history[0];
    const strokeColor = isUp ? 'var(--color-success)' : 'var(--color-danger)';
    
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  // Get unique genres from current characters list
  const genres = ['전체', ...Array.from(new Set(characters.map(c => c.genre || '기타')))];

  const filteredCharacters = characters.filter(c => {
    if (selectedGenreFilter === '전체') return true;
    return (c.genre || '기타') === selectedGenreFilter;
  });

  return (
    <div>
      <div className="app-header">
        <span>🔥 캐릭터 거래소 (Meme Market)</span>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '8px' }}>
            <Ticket size={14} className="text-warning" />
            내 지갑 잔고: {asset.availableVotes} P
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        ⚡ 목표치 100% 달성 시 메이저 리그로 즉시 졸업 등록됩니다. 충전된 포인트로 최애 캐릭터를 매수/매도하세요!
      </p>

      {/* 🔴 실시간 캐릭터 거래 현황판 */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(16, 24, 48, 0.8) 0%, rgba(9, 13, 22, 0.8) 100%)', 
        border: '1px solid rgba(255, 255, 255, 0.05)', 
        padding: '12px 16px', 
        marginBottom: '20px',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
          <span style={{ letterSpacing: '0.05em' }}>실시간 거래 피드 (LIVE TRADE STREAM)</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'hidden' }}>
          {liveTrades.map(trade => (
            <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
              <span>👤 {trade.wallet}</span>
              <span style={{ fontWeight: 800, color: trade.isBuy ? '#22c55e' : '#f43f5e' }}>
                {trade.isBuy ? 'BUY 🟢' : 'SELL 🔴'} {trade.amount} P of ${trade.ticker}
              </span>
              <span style={{ opacity: 0.6 }}>{trade.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Genre Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setSelectedGenreFilter(g)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedGenreFilter === g ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)',
              color: selectedGenreFilter === g ? 'white' : 'var(--color-text-secondary)',
              boxShadow: selectedGenreFilter === g ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
              marginBottom: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Characters List without Rank order badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[...filteredCharacters].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((char) => {
          const votedQty = getVotedCount(char.id);
          const history = char.voteHistory || [10];
          const isUp = char.voteChangeRate >= 0;

          return (
            <div key={char.id} className="card" style={{ padding: '16px', margin: 0 }}>
              {/* Header profile without img tag and without rank badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span>[{char.genre || '기타'}]</span>
                  <span style={{ color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>
                    ${char.group?.toUpperCase() || 'MEME'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{char.name}</h4>
                  <span 
                    style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 800,
                      color: isUp ? 'var(--color-success)' : 'var(--color-danger)'
                    }}
                  >
                    ({isUp ? '+' : ''}{char.voteChangeRate}%)
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: '1.3' }}>
                  {char.description}
                </p>
              </div>

              {/* Status info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.15)', padding: '12px 14px', borderRadius: '10px', marginBottom: '12px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>시가총액 (Market Cap)</span>
                  <div style={{ fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
                    {char.votes.toLocaleString()} P
                    {isUp ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>시세 차트</span>
                  {renderSparkline(history)}
                </div>
              </div>

              {/* Bonding Curve Neon Progress Bar */}
              {(() => {
                const limit = 10000;
                const progress = Math.min((char.votes / limit) * 100, 100);
                const isGraduated = progress >= 100;
                return (
                  <div style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex-between" style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      <span>본딩 커브 (Bonding Curve)</span>
                      <strong style={{ color: isGraduated ? '#c084fc' : '#22c55e' }}>
                        {isGraduated ? '🎓 메이저 상장 확정' : `${progress.toFixed(1)}%`}
                      </strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: isGraduated 
                          ? 'linear-gradient(90deg, #a855f7 0%, #d946ef 100%)' 
                          : 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)', 
                        boxShadow: isGraduated 
                          ? '0 0 8px #a855f7' 
                          : '0 0 8px #22c55e',
                        transition: 'width 0.3s ease' 
                      }} />
                    </div>
                  </div>
                );
              })()}

              {/* Simple Holding Status */}
              <div className="flex-between" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', padding: '0 4px', marginBottom: '12px' }}>
                <span>보유 수량: <strong style={{ color: 'var(--color-warning)' }}>{votedQty} P</strong></span>
                <span>(보유 포인트: {asset.availableVotes} P)</span>
              </div>

              {/* Swap Buy/Sell Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  className="btn btn-primary" 
                  disabled={asset.availableVotes <= 0}
                  onClick={() => openActionModal(char, 'vote')}
                  style={{ padding: '10px', fontSize: '0.85rem', background: '#22c55e', borderColor: '#22c55e', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)' }}
                >
                  캐릭터 매수 (BUY)
                </button>
                <button 
                  className="btn btn-success" 
                  disabled={votedQty <= 0}
                  onClick={() => openActionModal(char, 'unvote')}
                  style={{ padding: '10px', fontSize: '0.85rem', background: '#f43f5e', borderColor: '#f43f5e', boxShadow: '0 4px 10px rgba(244, 63, 94, 0.2)' }}
                >
                  캐릭터 매도 (SELL)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Modal */}
      {selectedChar && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '480px',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            marginBottom: 0,
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: 'none',
            padding: '24px',
            background: 'var(--bg-secondary)',
            animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>

            <div className="flex-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                {selectedChar.name} (${selectedChar.group?.toUpperCase()}) - {
                  modalType === 'vote' ? '캐릭터 매수 (BUY)' : '캐릭터 매도 (SELL)'
                }
              </h3>
              <button 
                onClick={closeActionModal} 
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Selected Character Preview - Text only */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '20px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>내 지갑 캐릭터 보유량</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {selectedChar.name} (${selectedChar.group?.toUpperCase()}) {getVotedCount(selectedChar.id)} P 보유 중
              </span>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label className="form-label">
                {
                  modalType === 'vote' ? `매수할 금액 (보유 잔고: ${asset.availableVotes} P)` :
                  `매도할 금액 (현재 보유량: ${getVotedCount(selectedChar.id)} P)`
                }
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionQty(Math.max(1, actionQty - 1))}
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '10px' }}
                >
                  <Minus size={16} />
                </button>
                <input 
                  type="number" 
                  className="form-input" 
                  value={actionQty} 
                  onChange={(e) => setActionQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ textAlign: 'center', flex: 1 }}
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setActionQty(actionQty + 1)}
                  style={{ width: '40px', height: '40px', padding: 0, borderRadius: '10px' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="flex-between" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>스왑 체결 후 예상 잔고</span>
              <span style={{ fontWeight: 700, color: 'white' }}>
                {
                  modalType === 'vote' ? `보유 포인트 ${asset.availableVotes - actionQty} P / 보유 수량 ${getVotedCount(selectedChar.id) + actionQty} P` :
                  `보유 포인트 ${asset.availableVotes + actionQty} P / 보유 수량 ${getVotedCount(selectedChar.id) - actionQty} P`
                }
              </span>
            </div>

            {/* Action Confirmation Button */}
            <button 
              className={`btn`}
              onClick={executeAction}
              style={{
                width: '100%',
                background: modalType === 'vote' ? '#22c55e' : '#f43f5e',
                color: 'white',
                fontWeight: 700,
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {
                modalType === 'vote' ? '캐릭터 매수 (BUY) 체결' : '캐릭터 매도 (SELL) 체결'
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
