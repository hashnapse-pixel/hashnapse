import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Key, Users, ArrowRight } from 'lucide-react';
import { dataService } from '../services/dataService';
import type { Room } from '../services/dataService';
import { useAlert } from './AlertContext';

interface RoomDashboardProps {
  onSelectRoom: (room: Room) => void;
}

export const RoomDashboard: React.FC<RoomDashboardProps> = ({ onSelectRoom }) => {
  const { showAlert, showToast } = useAlert();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create' | 'join'>('list');

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const myRooms = await dataService.getUserRooms();
      setRooms(myRooms);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // URL에서 초대 쿼리(?room=UUID) 파싱 및 자동 처리
  useEffect(() => {
    const handleUrlInvite = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlRoomId = params.get('room');
      if (urlRoomId) {
        try {
          setIsLoading(true);
          const joinedRoom = await dataService.joinRoom(urlRoomId);
          showToast(`🎉 초대 링크를 통해 [ ${joinedRoom.name} ] 방에 성공적으로 가입되었습니다!`, 'success');
          // 주소창 쿼리 스트링 깔끔하게 비우기
          window.history.replaceState({}, document.title, window.location.pathname);
          onSelectRoom(joinedRoom);
        } catch (err: any) {
          showAlert(err.message || '초대 링크 처리 중 오류가 발생했습니다.');
        } finally {
          setIsLoading(false);
        }
      } else {
        loadRooms();
      }
    };
    handleUrlInvite();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) {
      showToast('방 이름을 입력해주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const created = await dataService.createRoom(newRoomName);
      await showAlert(`🎉 [ ${created.name} ] 방이 성공적으로 생성되었습니다!`);
      setNewRoomName('');
      onSelectRoom(created);
    } catch (err: any) {
      showAlert(err.message || '방 생성 중 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      showToast('초대 코드(UUID)를 입력해주세요.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const joined = await dataService.joinRoom(inviteCode.trim());
      await showAlert(`🎉 [ ${joined.name} ] 방에 성공적으로 참여하였습니다!`);
      setInviteCode('');
      onSelectRoom(joined);
    } catch (err: any) {
      showAlert(err.message || '방 참여 중 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterGlobalRoom = async () => {
    try {
      setIsLoading(true);
      const globalRoom = await dataService.joinRoom('global');
      onSelectRoom(globalRoom);
    } catch (err: any) {
      showAlert(err.message || '공개 광장 입장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      padding: '24px 20px',
      background: 'var(--bg-primary)',
      color: 'white',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Cosmic Neon Backdrop Glows */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-15%',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 0, 127, 0.12) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        zIndex: 1
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-15%',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        zIndex: 1
      }} />

      <div style={{ zIndex: 2, width: '100%', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', marginTop: '20px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '14px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, rgba(255, 0, 127, 0.15) 0%, rgba(0, 240, 255, 0.15) 100%)',
            marginBottom: '18px',
            color: 'var(--color-primary)'
          }}>
            <Sparkles size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
            해시냅스 스페이스
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            나만의 방을 만들거나 친구의 초대 링크로 참여하세요 ✨
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '5px', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--card-border)' }}>
          <button 
            onClick={() => setActiveSubTab('list')}
            style={{
              flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer',
              background: activeSubTab === 'list' ? 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)' : 'transparent',
              color: activeSubTab === 'list' ? 'white' : 'var(--color-text-secondary)',
              boxShadow: activeSubTab === 'list' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            내 스페이스
          </button>
          <button 
            onClick={() => setActiveSubTab('create')}
            style={{
              flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer',
              background: activeSubTab === 'create' ? 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)' : 'transparent',
              color: activeSubTab === 'create' ? 'white' : 'var(--color-text-secondary)',
              boxShadow: activeSubTab === 'create' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            방 만들기
          </button>
          <button 
            onClick={() => setActiveSubTab('join')}
            style={{
              flex: 1, padding: '12px', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer',
              background: activeSubTab === 'join' ? 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)' : 'transparent',
              color: activeSubTab === 'join' ? 'white' : 'var(--color-text-secondary)',
              boxShadow: activeSubTab === 'join' ? '0 4px 15px var(--color-primary-glow)' : 'none',
              transition: 'all 0.25s ease'
            }}
          >
            초대 코드 가입
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '3px solid var(--card-border)', borderTopColor: 'var(--color-primary)',
              borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px'
            }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>스페이스 동기화 중...</span>
          </div>
        ) : (
          <>
            {/* 1. 방 리스트 */}
            {activeSubTab === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 📢 Public 스페이스 섹션 */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 800, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📢 Public 스페이스 (전체 공개 광장)</span>
                  </div>
                  <div 
                    className="card" 
                    onClick={handleEnterGlobalRoom}
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
                      border: '1px solid rgba(0, 240, 255, 0.2)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.4)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 240, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.2)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: '6px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌌 해시냅스 광장
                        <span style={{ fontSize: '0.62rem', background: '#00f0ff', color: '#090d16', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, letterSpacing: '0.03em' }}>PUBLIC</span>
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block', lineHeight: '1.4' }}>
                        모든 사용자가 참여하는 공개 광장 캐릭터 거래소입니다.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#00f0ff', fontSize: '0.85rem', fontWeight: 700 }}>
                      입장 <ArrowRight size={14} />
                    </div>
                  </div>
                </div>

                {/* 🔒 Private 스페이스 섹션 */}
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#a855f7', fontWeight: 800, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🔒 Private 스페이스 (초대 전용 비밀방)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {rooms.length === 0 ? (
                      <div className="card" style={{ textAlign: 'center', padding: '36px 20px', borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                        <Users size={28} style={{ color: 'var(--color-text-muted)', marginBottom: '10px' }} />
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                          가입된 비밀 스페이스가 없습니다.<br />스페이스를 생성하거나 초대 코드로 가입해 보세요.
                        </p>
                        <button className="btn btn-secondary" onClick={() => setActiveSubTab('create')} style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
                          비밀 스페이스 만들기 <ArrowRight size={14} />
                        </button>
                      </div>
                    ) : (
                      rooms.map(room => (
                        <div 
                          key={room.id} 
                          className="card" 
                          onClick={() => onSelectRoom(room)}
                          style={{
                            padding: '20px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(168, 85, 247, 0.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.borderColor = 'var(--card-border)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginBottom: '6px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              🔑 {room.name}
                              <span style={{ fontSize: '0.62rem', background: '#a855f7', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, letterSpacing: '0.03em' }}>PRIVATE</span>
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', display: 'block' }}>
                              개인 자산이 격리 적용되는 프라이빗 스페이스 (방장: {room.creator})
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 700 }}>
                            입장 <ArrowRight size={14} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 2. 방 만들기 */}
            {activeSubTab === 'create' && (
              <form onSubmit={handleCreateRoom} className="card" style={{ padding: '28px 24px' }}>
                <div className="form-group">
                  <label className="form-label">스페이스 이름</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="예: 최애스타 주주클럽, 스페이스 소모임"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <Plus size={18} />
                  스페이스 생성 후 입장
                </button>
              </form>
            )}

            {/* 3. 초대 가입 */}
            {activeSubTab === 'join' && (
              <form onSubmit={handleJoinRoom} className="card" style={{ padding: '28px 24px' }}>
                <div className="form-group">
                  <label className="form-label">스페이스 초대 코드</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="전달받은 room-xx 초대 코드를 입력하세요"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <Key size={18} />
                  초대 스페이스 참여하기
                </button>
              </form>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
