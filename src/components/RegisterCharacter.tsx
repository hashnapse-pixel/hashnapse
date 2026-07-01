import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAlert } from './AlertContext';

interface RegisterCharacterProps {
  currentRoomId: string;
  onCharacterRegistered: () => void;
  onNavigateToMarket: () => void;
}

// Default image placeholder to use for all registered characters
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1535268647977-a403b69fc756?w=200&auto=format&fit=crop&q=60';


export const RegisterCharacter: React.FC<RegisterCharacterProps> = ({ currentRoomId, onCharacterRegistered, onNavigateToMarket }) => {
  const { showAlert, showToast } = useAlert();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('밈');
  const [customGenre, setCustomGenre] = useState('');
  const [group, setGroup] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handles input change, stripping space and limiting to 10 chars immediately
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleanValue = rawValue.replace(/\s/g, '').slice(0, 10);
    setName(cleanValue);
  };

  // Handles ticker input change, forcing alphanumeric uppercase and max 8 chars
  const handleGroupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cleanValue = rawValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    setGroup(cleanValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('캐릭터 이름을 입력해주세요.', 'error');
      return;
    }
    const resolvedGenre = genre === 'custom' ? customGenre.trim() : genre;
    if (!resolvedGenre) {
      showToast('캐릭터 테마를 선택하거나 입력해주세요.', 'error');
      return;
    }
    if (!group.trim()) {
      showToast('티커 심볼을 입력해주세요.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.registerCharacter(
        currentRoomId,
        name, 
        description, 
        DEFAULT_IMAGE_URL, 
        resolvedGenre, 
        group.trim().toUpperCase()
      );
      await showAlert(`🎉 새로운 캐릭터 [ $${group.trim().toUpperCase()} ]이 성공적으로 상장되었습니다!\n상장 수수료 100 P가 차감되었으며, 최초 발행자 지분 1% (10,000 장)가 즉시 지급되었습니다.`);
      
      setName('');
      setDescription('');
      setGroup('');
      setGenre('밈');
      setCustomGenre('');

      onCharacterRegistered();
      onNavigateToMarket();
    } catch (err: any) {
      console.error(err);
      showAlert(err.message || '등록 중 에러가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="app-header">
        <span>🚀 캐릭터 상장 (Character Listing)</span>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
        🔥 나만의 독창적인 아이디어와 최애 캐릭터를 상장하여 널리 알려보세요! 상장 수수료로 **100 P**가 차감되며 100만 장이 발행됩니다. (생성 즉시 최초 발행자에게 지분 1%인 10,000 장이 무료 포상 지급됩니다.)
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '24px 20px' }}>
        {/* Genre Selection */}
        <div className="form-group">
          <label className="form-label">캐릭터 장르 / 카테고리 (Theme)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <select 
              className="form-input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              style={{ background: 'var(--bg-secondary)', color: 'white', cursor: 'pointer' }}
            >
              <option value="밈">순수 밈 / 드립 (Pure Meme)</option>
              <option value="가요">인물 / 인플루언서 (Star)</option>
              <option value="웹툰">웹툰 / 캐릭터 (Character)</option>
              <option value="웹소설">웹소설 / 판타지 (Web Novel)</option>
              <option value="애니메이션">애니메이션 (Anime)</option>
              <option value="버추얼">버추얼 / VTuber (VTuber)</option>
              <option value="게임">게임 / 서브컬처 (Game)</option>
              <option value="custom">직접 입력 (기타)</option>
            </select>
            {genre === 'custom' && (
              <input 
                type="text" 
                className="form-input" 
                placeholder="카테고리 테마를 직접 입력해주세요"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                maxLength={10}
              />
            )}
          </div>
        </div>

        {/* Ticker / Symbol Name */}
        <div className="form-group">
          <label className="form-label">티커 심볼 (Ticker / Symbol)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="예: SPARK, PANDA, HARU (대문자 영문/숫자 최대 8자)"
            value={group}
            onChange={handleGroupChange}
            maxLength={8}
          />
        </div>

        {/* Character Name */}
        <div className="form-group">
          <label className="form-label">캐릭터 이름 (Character Name)</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="예: 스파클링토끼, 골든독"
            value={name}
            onChange={handleNameChange}
            maxLength={10}
          />
        </div>

        {/* Project Description */}
        <div className="form-group">
          <label className="form-label">캐릭터 한 줄 소개 (Description)</label>
          <textarea 
            className="form-input form-textarea" 
            placeholder="이 캐릭터가 인기 폭발해야 하는 이유와 세계관을 설명해주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={60}
          />
        </div>



        {/* Submit */}
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={isSubmitting}
          style={{ marginTop: '10px' }}
        >
          <PlusCircle size={18} />
          {isSubmitting ? '상장 진행 중...' : '🔥 최애 캐릭터 상장하기 (수수료 100 P)'}
        </button>
      </form>
    </div>
  );
};
