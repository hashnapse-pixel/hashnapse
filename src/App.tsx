import { useState, useEffect } from 'react';
import { Home, TrendingUp, Briefcase, PlusCircle, LogOut, Sparkles, Users, X, Vote } from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { Dashboard } from './components/Dashboard';
import { Market } from './components/Market';
import { Portfolio } from './components/Portfolio';
import { RegisterCharacter } from './components/RegisterCharacter';
import { RoomDashboard } from './components/RoomDashboard';
import { RoomMembers } from './components/RoomMembers';
import { Voting } from './components/Voting';
import { dataService } from './services/dataService';
import type { Character, UserAsset, Room } from './services/dataService';
import { useAlert } from './components/AlertContext';

type Tab = 'dashboard' | 'market' | 'portfolio' | 'members' | 'register' | 'voting';

function App() {
  const { showAlert, showConfirm } = useAlert();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>({ id: 'global', name: '해시냅스', creator: 'system', createdAt: 0 });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [asset, setAsset] = useState<UserAsset>({
    totalSteps: 0,
    claimedSteps: 0,
    availableVotes: 0,
    pendingVotes: 0,
    scheduledVotes: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Deep Link States
  const [pendingInviteRoomId, setPendingInviteRoomId] = useState<string | null>(null);
  const [pendingInviteRoom, setPendingInviteRoom] = useState<Room | null>(null);
  const [isFetchingInviteRoom, setIsFetchingInviteRoom] = useState(false);

  // Sync and fetch user data once email and current room are set
  const loadUserData = async () => {
    if (!currentRoom) return;
    setIsLoading(true);
    try {
      await dataService.syncWithSupabase(currentRoom.id);
      
      const charData = await dataService.getCharacters(currentRoom.id);
      setCharacters(charData);
      
      const assetData = await dataService.getUserAsset(currentRoom.id);
      setAsset(assetData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize and check login session
  useEffect(() => {
    async function checkSession() {
      try {
        const email = await dataService.getCurrentUserEmail();
        if (email) {
          setUserEmail(email);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        setIsLoading(false);
      }
    }
    checkSession();

    // Subscribe to Auth state changes
    const unsubscribe = dataService.onAuthChange((email) => {
      setUserEmail(email);
      if (!email) {
        setCurrentRoom(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // 딥링크 이벤트 감지 및 파싱
  useEffect(() => {
    const handleDeepLink = async (urlStr: string) => {
      console.log('App URL Open Event Received:', urlStr);
      let roomId = '';
      try {
        if (urlStr.includes('room=')) {
          roomId = urlStr.split('room=')[1].split('&')[0];
        } else if (urlStr.includes('id=')) {
          roomId = urlStr.split('id=')[1].split('&')[0];
        }
      } catch (err) {
        console.error('Deep link URL parse error:', err);
      }

      if (roomId) {
        const email = await dataService.getCurrentUserEmail();
        if (email) {
          setPendingInviteRoomId(roomId);
        } else {
          // 비로그인 상태일 때는 로그인 후 즉시 가입 모달을 띄우기 위해 보관
          localStorage.setItem('pending_invite_room_id', roomId);
        }
      }
    };

    // 앱이 종료 상태에서 딥링크로 켜졌을 때 URL 체크
    CapApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl && launchUrl.url) {
        handleDeepLink(launchUrl.url);
      }
    }).catch((err) => console.error('getLaunchUrl err:', err));

    // 앱이 켜진 상태(백그라운드 등)에서 딥링크 수신 시
    const appUrlOpenListener = CapApp.addListener('appUrlOpen', (event: any) => {
      if (event && event.url) {
        handleDeepLink(event.url);
      }
    });

    return () => {
      appUrlOpenListener.then((l) => l.remove());
    };
  }, []);

  // 로그인 성공 시 대기 중이던 딥링크 초대 수락 팝업 활성화
  useEffect(() => {
    if (userEmail) {
      const savedRoomId = localStorage.getItem('pending_invite_room_id');
      if (savedRoomId) {
        localStorage.removeItem('pending_invite_room_id');
        setPendingInviteRoomId(savedRoomId);
      }
    }
  }, [userEmail]);

  // 대기 중인 초대 방 ID가 설정되면 해당 방 정보 로드
  useEffect(() => {
    const fetchInviteRoomDetail = async () => {
      if (!pendingInviteRoomId) {
        setPendingInviteRoom(null);
        return;
      }
      setIsFetchingInviteRoom(true);
      try {
        const detail = await dataService.getRoomDetail(pendingInviteRoomId);
        setPendingInviteRoom(detail);
      } catch (err) {
        console.error('Failed to load pending room:', err);
      } finally {
        setIsFetchingInviteRoom(false);
      }
    };
    fetchInviteRoomDetail();
  }, [pendingInviteRoomId]);

  // 초대 수락 처리
  const handleAcceptInvite = async () => {
    if (!pendingInviteRoomId) return;
    try {
      const roomObj = await dataService.joinRoom(pendingInviteRoomId);
      showAlert(`⚡️ [${roomObj.name}] 스페이스 가입이 완료되었습니다!`);
      setCurrentRoom(roomObj);
      setPendingInviteRoomId(null);
      setPendingInviteRoom(null);
    } catch (err: any) {
      showAlert(err.message || '가입 수락 중 오류가 발생했습니다.');
    }
  };

  // 초대 거절 처리
  const handleDeclineInvite = () => {
    setPendingInviteRoomId(null);
    setPendingInviteRoom(null);
  };

  // Run data loading once user email and current room state becomes valid
  useEffect(() => {
    if (userEmail && currentRoom) {
      loadUserData();
    }
  }, [userEmail, currentRoom]);

  // Handle X (Twitter) Login
  const handleXLogin = async () => {
    setIsLoggingIn(true);
    try {
      await dataService.loginWithX();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || 'X 로그인 중 에러가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    const confirmed = await showConfirm('정말 로그아웃 하시겠습니까?');
    if (confirmed) {
      await dataService.logout();
      setUserEmail(null);
      setCurrentRoom(null);
      setActiveTab('dashboard');
    }
  };


  const handleUpdateAsset = async (newAsset: UserAsset) => {
    if (!currentRoom) return;
    setAsset(newAsset);
    await dataService.saveUserAsset(currentRoom.id, newAsset);
  };

  const refreshCharacters = async () => {
    if (currentRoom) {
      const freshList = await dataService.getCharacters(currentRoom.id);
      setCharacters(freshList);
    }
  };

  // 1. Loading State Screen
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--color-primary)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--card-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px',
          boxShadow: '0 0 15px var(--color-primary-glow)'
        }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600, letterSpacing: '-0.01em' }}>데이터 동기화 중...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Login Screen (Google Sign-In)
  if (!userEmail) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100vh',
        padding: '24px',
        background: 'var(--bg-primary)',
        alignItems: 'center',
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
          background: 'radial-gradient(circle, rgba(255, 0, 127, 0.15) 0%, rgba(0,0,0,0) 70%)',
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
          background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(60px)',
          zIndex: 1
        }} />

        <div className="card" style={{ 
          width: '100%', 
          maxWidth: '400px', 
          padding: '44px 28px', 
          background: 'var(--card-bg)', 
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          zIndex: 2,
          position: 'relative'
        }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '16px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, rgba(255, 0, 127, 0.2) 0%, rgba(0, 240, 255, 0.2) 100%)', 
            marginBottom: '22px', 
            color: 'var(--color-primary)' 
          }}>
            <Sparkles size={36} />
          </div>
          <h2 style={{ 
            fontSize: '1.8rem', 
            fontWeight: 900, 
            fontFamily: 'var(--font-display)', 
            color: 'white', 
            marginBottom: '12px',
            letterSpacing: '-0.03em'
          }}>
            해시냅스 (Hashnapse)
          </h2>
          <p style={{ 
            fontSize: '0.88rem', 
            color: 'var(--color-text-secondary)', 
            marginBottom: '36px', 
            lineHeight: '1.6' 
          }}>
            무료 포인트를 받고 나만의 최애 캐릭터를 상장하거나 거래를 시작해보세요.
          </p>

          {/* Primary: X Login Button */}
          <button 
            onClick={handleXLogin} 
            disabled={isLoggingIn} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: '#ffffff',
              color: '#000000',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              boxShadow: '0 4px 15px rgba(255, 255, 255, 0.15)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.15)';
            }}
          >
            {isLoggingIn ? (
              <span>X 연동 중...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '10px' }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X 계정으로 시작하기
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 3. Room Selection/Creation Screen
  if (!currentRoom) {
    return <RoomDashboard onSelectRoom={setCurrentRoom} />;
  }

  // 4. Main App Screen (Inside Room)
  return (
    <>
      {/* Top Session Bar */}
      <div style={{
        padding: '10px 20px',
        background: 'rgba(22, 31, 48, 0.6)',
        borderBottom: '1px solid var(--card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--color-text-secondary)',
        zIndex: 50,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🌌 {currentRoom?.name || '해시냅스'}
          </span>
          <button 
            onClick={() => setCurrentRoom(null)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              padding: '2px 8px',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '0.65rem',
              fontWeight: 600
            }}
          >
            스페이스 전환
          </button>
        </span>
        <button 
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          <LogOut size={12} />
          로그아웃
        </button>
      </div>

      <div className="app-content" style={{ paddingTop: '10px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard currentRoomId={currentRoom.id} asset={asset} onUpdateAsset={handleUpdateAsset} />
        )}
        {activeTab === 'market' && (
          <Market 
            currentRoomId={currentRoom.id}
            characters={characters} 
            asset={asset} 
            onUpdateAsset={handleUpdateAsset} 
            onRefreshCharacters={refreshCharacters}
          />
        )}
        {activeTab === 'portfolio' && (
          <Portfolio 
            currentRoomId={currentRoom.id}
            asset={asset} 
            characters={characters} 
            onNavigateToMarket={() => setActiveTab('market')}
          />
        )}
        {activeTab === 'members' && (
          <RoomMembers 
            room={currentRoom} 
            onKickedSelf={(isSelfLeft?: boolean) => {
              if (!isSelfLeft) {
                showAlert('📢 정족수 달성으로 인해 이 스페이스에서 강퇴 처리되었습니다.');
              }
              setCurrentRoom(null);
              setActiveTab('dashboard');
            }}
          />
        )}
        {activeTab === 'register' && (
          <RegisterCharacter 
            currentRoomId={currentRoom.id}
            onCharacterRegistered={refreshCharacters}
            onNavigateToMarket={() => setActiveTab('market')}
          />
        )}
        {activeTab === 'voting' && (
          <Voting 
            currentRoomId={currentRoom.id}
            asset={asset}
            onUpdateAsset={handleUpdateAsset}
            userEmail={userEmail}
          />
        )}
      </div>

      {/* Bottom Nav Bar */}
      <nav className="nav-bar">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={22} />
          <span>홈</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          <TrendingUp size={22} />
          <span>스왑 보드</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          <Briefcase size={22} />
          <span>포트폴리오</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <Users size={22} />
          <span>멤버</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'voting' ? 'active' : ''}`}
          onClick={() => setActiveTab('voting')}
        >
          <Vote size={22} />
          <span>투표</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <PlusCircle size={22} />
          <span>캐릭터 상장</span>
        </button>
      </nav>

      {/* MZ style Deep Link Invitation Modal */}
      {pendingInviteRoomId && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '380px',
            background: 'rgba(20, 24, 38, 0.95)',
            border: '2px solid rgba(255, 0, 127, 0.3)',
            borderRadius: '28px',
            padding: '30px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(255, 0, 127, 0.15)',
            position: 'relative',
            overflow: 'visible'
          }}>
            {/* Top decorative badge */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #ff007f 0%, #7c3aed 100%)',
              padding: '6px 16px',
              borderRadius: '20px',
              color: 'white',
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              boxShadow: '0 4px 10px rgba(255, 0, 127, 0.3)'
            }}>
              INVITATION
            </div>

            <button 
              onClick={handleDeclineInvite}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ 
              display: 'inline-flex', 
              padding: '16px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, rgba(255, 0, 127, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)', 
              marginBottom: '20px', 
              color: '#ff007f',
              marginTop: '10px'
            }}>
              <Sparkles size={32} />
            </div>

            {isFetchingInviteRoom ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  border: '3px solid var(--card-border)',
                  borderTopColor: '#ff007f',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 10px'
                }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>스페이스 정보를 확인 중...</p>
              </div>
            ) : pendingInviteRoom ? (
              <>
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  color: 'white',
                  marginBottom: '10px'
                }}>
                  스페이스 초대 도착 🚀
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.6',
                  marginBottom: '28px'
                }}>
                  <strong style={{ color: '#00f0ff', fontSize: '1.05rem' }}>{pendingInviteRoom.name}</strong><br />
                  스페이스에서 함께 활동을 시작해볼까요?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button 
                    onClick={handleAcceptInvite}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #ff007f 0%, #7c3aed 100%)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(255, 0, 127, 0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    참가하여 입덕하기 ⚡️
                  </button>
                  <button 
                    onClick={handleDeclineInvite}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--color-text-secondary)',
                      fontWeight: 650,
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    거절할래요
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '10px' }}>
                  존재하지 않는 스페이스
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                  초대받은 스페이스를 찾을 수 없거나 삭제되었습니다.
                </p>
                <button 
                  onClick={handleDeclineInvite}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'var(--bg-tertiary)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </>
            )}
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

export default App;
