import React, { useState, useEffect } from 'react';
import { UserMinus, ShieldAlert, Check, Copy } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { Room, RoomMember, KickVote } from '../services/dataService';
import { useAlert } from './AlertContext';

interface RoomMembersProps {
  room: Room;
  onKickedSelf: (isSelfLeft?: boolean) => void; // 만약 내가 강퇴당한 경우의 핸들러
}

export const RoomMembers: React.FC<RoomMembersProps> = ({ room, onKickedSelf }) => {
  const { showAlert, showConfirm, showToast } = useAlert();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [kickStatus, setKickStatus] = useState<Record<string, { votedCount: number; requiredCount: number; currentPct: number; kicked: boolean; votedEmails: string[] }>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadMemberData = async () => {
    setIsLoading(true);
    try {
      const email = await dataService.getCurrentUserEmail();
      setMyEmail(email);

      // 내가 만약 강퇴당했는지 확인 (비공개 방에 한해서만 검사)
      const currentMembers = await dataService.getRoomMembers(room.id);
      const isStillMember = currentMembers.some(m => m.userEmail === email);
      if (room.id !== 'global' && email && !isStillMember) {
        onKickedSelf();
        return;
      }

      setMembers(currentMembers);

      // 각 멤버별 강퇴 투표 현황 산출
      const statusMap: typeof kickStatus = {};
      const kickVotes = localStorage.getItem('kick_votes_list') ? JSON.parse(localStorage.getItem('kick_votes_list')!) as KickVote[] : [];
      
      for (const m of currentMembers) {
        if (m.userEmail === email) continue; // 본인 제외
        const vote = kickVotes.find(v => v.roomId === room.id && v.targetEmail === m.userEmail);
        const evalStatus = await dataService.evaluateKickStatus(room.id, m.userEmail);
        statusMap[m.userEmail] = {
          ...evalStatus,
          votedEmails: vote ? vote.votedEmails : []
        };
      }
      setKickStatus(statusMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    const confirm = await showConfirm(`정말 [ ${room.name} ] 스페이스를 탈퇴하시겠습니까?\n탈퇴 시 이 스페이스의 내 활동 및 자산 데이터가 모두 삭제됩니다.`);
    if (!confirm) return;

    try {
      await dataService.leaveRoom(room.id);
      await showAlert(`[ ${room.name} ] 스페이스에서 정상적으로 탈퇴되었습니다.`);
      onKickedSelf(true);
    } catch (err: any) {
      showAlert(err.message || '탈퇴 중 에러가 발생했습니다.');
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [room]);

  const handleVoteKick = async (targetEmail: string, nickname: string) => {
    const isVoted = kickStatus[targetEmail]?.votedEmails.includes(myEmail || '');
    const confirmMessage = isVoted 
      ? `이미 [ ${nickname} ] 멤버의 퇴출에 투표하셨습니다.`
      : `정말 [ ${nickname} ] 멤버를 이 스페이스에서 퇴출시키는 것에 동의하십니까?`;

    if (isVoted) {
      showAlert(confirmMessage);
      return;
    }

    const confirm = await showConfirm(confirmMessage);
    if (!confirm) return;

    try {
      const res = await dataService.voteKickMember(room.id, targetEmail);
      await showAlert(res.message);
      loadMemberData(); // 데이터 새로고침
    } catch (err: any) {
      showAlert(err.message || '퇴출 투표 도중 에러가 발생했습니다.');
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `https://hashnapse-invite.vercel.app/invite?room=${room.id}`;
    navigator.clipboard.writeText(inviteUrl)
      .then(() => showToast('초대 링크가 클립보드에 복사되었습니다!', 'success'))
      .catch(() => showToast('초대 링크 복사에 실패했습니다.', 'error'));
  };

  return (
    <div>
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>스페이스 멤버 ({members.length})</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={copyInviteLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)',
              border: 'none',
              color: 'white',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(139, 92, 246, 0.2)'
            }}
          >
            <Copy size={12} />
            초대 링크 복사
          </button>
          
          {room.id !== 'global' && (
            <button 
              onClick={handleLeaveRoom}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ff4d4d',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              스페이스 탈퇴
            </button>
          )}
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
        👥 현재 스페이스에 속한 멤버 명부입니다. 멤버가 **9명 이상**인 경우에는 멤버의 **1/3 이상** 찬성 시 퇴출되며, **8명 이하**인 경우에는 **2/3 이상** 찬성 시 강제 퇴출 조치됩니다.
      </p>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
          멤버 목록을 불러오는 중입니다...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {members.map(member => {
            const isMe = member.userEmail === myEmail;
            const voteInfo = kickStatus[member.userEmail];
            const hasVoted = voteInfo?.votedEmails.includes(myEmail || '');

            return (
              <div key={member.userEmail} className="card" style={{ 
                padding: '18px 20px', 
                margin: 0, 
                background: isMe ? 'rgba(255, 0, 127, 0.05)' : 'var(--card-bg)', 
                border: isMe ? '1px solid rgba(255, 0, 127, 0.3)' : '1px solid var(--card-border)',
                boxShadow: isMe ? '0 8px 24px rgba(255, 0, 127, 0.08)' : '0 8px 24px rgba(0, 0, 0, 0.25)'
              }}>
                <div className="flex-between">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white' }}>
                        {member.nickname}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          나
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '2px' }}>
                      {member.userEmail}
                    </span>
                  </div>

                  {!isMe && (
                    <button
                      className={`btn ${hasVoted ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleVoteKick(member.userEmail, member.nickname)}
                      style={{
                        width: 'auto',
                        padding: '8px 14px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {hasVoted ? <Check size={12} /> : <UserMinus size={12} />}
                      {hasVoted ? '퇴출 찬성함' : '퇴출 투표'}
                    </button>
                  )}
                </div>

                {/* 퇴출 투표 진척도 표시 (타인 대상만) */}
                {!isMe && voteInfo && voteInfo.votedCount > 0 && (
                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--card-border)' }}>
                    <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShieldAlert size={12} className="text-danger" /> 
                        퇴출 정족수 현황 ({voteInfo.votedCount} / {voteInfo.requiredCount} 찬성 필요)
                      </span>
                      <span className="text-danger" style={{ fontWeight: 700 }}>
                        {voteInfo.currentPct}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${Math.min(100, (voteInfo.votedCount / voteInfo.requiredCount) * 100)}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-danger) 100%)', 
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
