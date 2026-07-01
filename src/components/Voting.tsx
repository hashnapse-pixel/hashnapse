import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Minus } from 'lucide-react';
import type { UserAsset } from '../services/dataService';
import { useAlert } from './AlertContext';

interface VotingProps {
  currentRoomId: string;
  asset: UserAsset;
  onUpdateAsset: (newAsset: UserAsset) => void;
  userEmail: string | null;
}

interface Option {
  id: string;
  text: string;
  votes: number;
}

interface Agenda {
  id: string;
  title: string;
  description: string;
  endDate: string;
  options: Option[];
  totalVotes: number;
}

interface UserVoteInfo {
  optionId: string;
  amount: number;
}

export const Voting: React.FC<VotingProps> = ({ asset, onUpdateAsset, userEmail }) => {
  const { showAlert, showToast } = useAlert();
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, UserVoteInfo>>({});
  const [voteAmount, setVoteAmount] = useState<number>(100);
  const [selectedOption, setSelectedOption] = useState<{ agendaId: string; optionId: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 글로벌 통합 투표 데이터 로드 및 초기화
  useEffect(() => {
    const globalKey = 'voting_agendas_global';
    const saved = localStorage.getItem(globalKey);
    if (saved) {
      setAgendas(JSON.parse(saved));
    } else {
      // 전역 기본 안건 2개 셋업
      const defaultAgendas: Agenda[] = [
        {
          id: 'agenda-1',
          title: '🔥 메이저 리그 상장 후보 적격성 심사',
          description: '현재 스페이스 내 1위인 캐릭터를 메이저 거래소로 즉시 상장 및 졸업시킬 것인가에 대한 주주 투표입니다.',
          endDate: '2026-07-07 23:59',
          options: [
            { id: 'opt-yes', text: '찬성 (즉시 상장 승인)', votes: 3420 },
            { id: 'opt-no', text: '반대 (본딩 커브 조건 유지)', votes: 1250 }
          ],
          totalVotes: 4670
        },
        {
          id: 'agenda-2',
          title: '🏆 이달의 대표 캐릭터 명예의 전당 헌액',
          description: '이번 달 가장 활발한 매매와 포스팅을 기록한 후보들 중 명예의 전당 스포트라이트를 받을 최애를 골라주세요.',
          endDate: '2026-07-15 18:00',
          options: [
            { id: 'opt-char-1', text: '스파클링토끼 ($SPARK)', votes: 850 },
            { id: 'opt-char-2', text: '골든독 ($GOLD)', votes: 620 },
            { id: 'opt-char-3', text: '아이언판다 ($PANDA)', votes: 1100 }
          ],
          totalVotes: 2570
        }
      ];
      localStorage.setItem(globalKey, JSON.stringify(defaultAgendas));
      setAgendas(defaultAgendas);
    }
  }, []);

  // 사용자 이메일별 개별 투표 상태 로드
  useEffect(() => {
    const userKey = `user_votes_${userEmail || 'guest'}`;
    const savedVotes = localStorage.getItem(userKey);
    if (savedVotes) {
      setMyVotes(JSON.parse(savedVotes));
    } else {
      setMyVotes({});
    }
  }, [userEmail]);

  const saveGlobalAgendas = (updated: Agenda[]) => {
    setAgendas(updated);
    localStorage.setItem('voting_agendas_global', JSON.stringify(updated));
  };

  const saveUserVotes = (updatedVotes: Record<string, UserVoteInfo>) => {
    setMyVotes(updatedVotes);
    localStorage.setItem(`user_votes_${userEmail || 'guest'}`, JSON.stringify(updatedVotes));
  };

  const handleVoteSubmit = async (agendaId: string) => {
    if (!selectedOption || selectedOption.agendaId !== agendaId) {
      showToast('투표할 항목을 먼저 선택해주세요.', 'error');
      return;
    }

    if (voteAmount <= 0) {
      showToast('투표할 포인트를 1 P 이상 입력해주세요.', 'error');
      return;
    }

    if (asset.availableVotes < voteAmount) {
      showToast(`보유 포인트가 부족합니다. (현재 보유: ${asset.availableVotes} P)`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 자산 업데이트
      const newAsset = {
        ...asset,
        availableVotes: asset.availableVotes - voteAmount
      };
      await onUpdateAsset(newAsset);

      // 2. 글로벌 전역 안건 득표수 누적
      const updatedAgendas = agendas.map(agenda => {
        if (agenda.id === agendaId) {
          const updatedOptions = agenda.options.map(opt => {
            if (opt.id === selectedOption.optionId) {
              return { ...opt, votes: opt.votes + voteAmount };
            }
            return opt;
          });
          return {
            ...agenda,
            options: updatedOptions,
            totalVotes: agenda.totalVotes + voteAmount
          };
        }
        return agenda;
      });
      saveGlobalAgendas(updatedAgendas);

      // 3. 사용자 개별 투표 내역 저장
      const existingVote = myVotes[agendaId];
      const updatedUserVotes = {
        ...myVotes,
        [agendaId]: {
          optionId: selectedOption.optionId,
          amount: (existingVote?.amount || 0) + voteAmount
        }
      };
      saveUserVotes(updatedUserVotes);

      showAlert(`🎉 선택하신 항목에 ${voteAmount.toLocaleString()} P 투표가 성공적으로 완료되었습니다!`);
      setSelectedOption(null);
    } catch (err) {
      console.error(err);
      showAlert('투표 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="app-header">
        <span>🗳️ 커뮤니티 투표소 (Governance)</span>
        <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '8px' }}>
            보유 포인트: {asset.availableVotes.toLocaleString()} P
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
        💡 보유하신 포인트를 사용하여 스페이스 내 주요 의사결정 및 캐릭터 인기 투표에 직접 기여하실 수 있습니다. (투표된 포인트는 소모되며 반환되지 않습니다)
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {agendas.map(agenda => {
          const userVote = myVotes[agenda.id];
          const isVoted = !!userVote;
          const myVotedOptionId = userVote?.optionId;
          const myVotedAmount = userVote?.amount;

          return (
            <div key={agenda.id} className="card" style={{ padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
              
              {/* Glow Decoration */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, rgba(0,0,0,0) 70%)',
                filter: 'blur(20px)',
                borderRadius: '50%'
              }} />

              {/* Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '1.4', paddingRight: '10px' }}>
                  {agenda.title}
                </h3>
                <span style={{ 
                  fontSize: '0.65rem', 
                  background: isVoted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: isVoted ? '#22c55e' : 'var(--color-text-secondary)',
                  border: isVoted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontWeight: 700,
                  whiteSpace: 'nowrap'
                }}>
                  {isVoted ? `참여완료 (${myVotedAmount} P)` : '진행중'}
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                {agenda.description}
              </p>

              {/* Options & Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {agenda.options.map(opt => {
                  const percentage = agenda.totalVotes > 0 ? Math.round((opt.votes / agenda.totalVotes) * 100) : 0;
                  const isSelected = selectedOption?.agendaId === agenda.id && selectedOption?.optionId === opt.id;
                  const isMyVotedOpt = myVotedOptionId === opt.id;

                  return (
                    <div 
                      key={opt.id}
                      onClick={() => {
                        if (!isVoted) {
                          setSelectedOption({ agendaId: agenda.id, optionId: opt.id });
                        }
                      }}
                      style={{
                        position: 'relative',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: isSelected 
                          ? '1px solid var(--color-primary)' 
                          : isMyVotedOpt
                            ? '1px solid #22c55e'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        cursor: isVoted ? 'default' : 'pointer',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Gauge Bar */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${percentage}%`,
                        background: isMyVotedOpt 
                          ? 'rgba(34, 197, 94, 0.1)' 
                          : 'rgba(0, 240, 255, 0.04)',
                        zIndex: 1,
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />

                      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          fontWeight: (isSelected || isMyVotedOpt) ? 800 : 600,
                          color: isMyVotedOpt ? '#22c55e' : isSelected ? 'var(--color-primary)' : 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {isMyVotedOpt && <CheckCircle2 size={14} />}
                          {opt.text}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255, 255, 255, 0.8)' }}>
                          {opt.votes.toLocaleString()} P ({percentage}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vote Input Area (Only if not voted yet) */}
              {!isVoted ? (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: '1px solid rgba(255,255,255,0.03)', 
                  borderRadius: '14px', 
                  padding: '16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>투표할 수량 설정</span>
                    <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>
                      {voteAmount.toLocaleString()} P 행사 예정
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setVoteAmount(Math.max(10, voteAmount - 50))}
                      style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={voteAmount} 
                      onChange={(e) => setVoteAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ textAlign: 'center', flex: 1, margin: 0, padding: '6px' }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setVoteAmount(voteAmount + 50)}
                      style={{ width: '36px', height: '36px', padding: 0, borderRadius: '8px' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleVoteSubmit(agenda.id)}
                    className="btn btn-primary"
                    disabled={isSubmitting || !selectedOption || selectedOption.agendaId !== agenda.id}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)',
                      boxShadow: '0 4px 15px rgba(255, 0, 127, 0.25)',
                      fontWeight: 800,
                      fontSize: '0.85rem'
                    }}
                  >
                    {isSubmitting ? '투표 전송 중...' : '🗳️ 설정한 포인트로 투표 참여'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.05)', padding: '10px 14px', borderRadius: '10px', justifyContent: 'center' }}>
                  <CheckCircle2 size={13} />
                  <span>이 안건에 총 {myVotedAmount?.toLocaleString()} P의 의사결정 권리를 행사하셨습니다.</span>
                </div>
              )}

              {/* End Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                <span>투표율 집계: 실시간 반영</span>
                <span>종료 시간: {agenda.endDate}</span>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
