import { useState, useRef, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    id: string;
    nickname: string;
    bio: string | null;
    email_public?: boolean;
    profile_image?: string | null;
  };
  onSuccess: () => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
  currentProfile,
  onSuccess,
}: ProfileEditModalProps) {
  const [nickname, setNickname] = useState(currentProfile.nickname);
  const [bio, setBio] = useState(currentProfile.bio || '');
  const [emailPublic, setEmailPublic] = useState(currentProfile.email_public || false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNickname(currentProfile.nickname);
      setBio(currentProfile.bio || '');
      setEmailPublic(currentProfile.email_public || false);
      setProfileImage(currentProfile.profile_image || null);
    }
  }, [isOpen, currentProfile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = async (file: File) => {
    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    setUploading(true);

    try {
      // 파일 업로드
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${currentProfile.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const {
        data: { publicUrl },
      } = supabase.storage.from('blog-images').getPublicUrl(filePath);

      setProfileImage(publicUrl);
      toast.success('프로필 사진이 업로드되었습니다.');
    } catch (error) {
      console.error('프로필 사진 업로드 오류:', error);
      toast.error('프로필 사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // 유효성 검사
    if (!nickname.trim()) {
      toast.error('닉네임을 입력해주세요.');
      return;
    }

    if (nickname.length < 2 || nickname.length > 20) {
      toast.error('닉네임은 2-20자 사이여야 합니다.');
      return;
    }

    if (bio.length > 200) {
      toast.error('자기소개는 200자 이내여야 합니다.');
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        nickname: nickname.trim(),
        bio: bio.trim() || null,
        email_public: emailPublic,
        updated_at: new Date().toISOString(),
      };

      if (profileImage) {
        updateData.profile_image = profileImage;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', currentProfile.id);

      if (error) throw error;

      toast.success('프로필이 수정되었습니다.');
      onClose();
      onSuccess();
    } catch (error) {
      console.error('프로필 수정 오류:', error);
      toast.error('프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <h2 className="text-2xl font-bold">프로필 편집</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-6">
          {/* 프로필 사진 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              프로필 사진
            </label>
            <div className="flex flex-col items-center gap-4">
              {/* 현재 프로필 사진 */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="프로필"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{currentProfile.nickname[0].toUpperCase()}</span>
                )}
              </div>

              {/* 드래그 & 드롭 영역 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-gray-600">업로드 중...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      클릭하거나 드래그해서 사진 업로드
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, GIF, WEBP (최대 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 닉네임 */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              닉네임 <span className="text-red-500">*</span>
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임 (2-20자)"
              maxLength={20}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {nickname.length}/20자
            </p>
          </div>

          {/* 한 줄 소개 */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              한 줄 소개
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자신을 소개해주세요 (최대 200자)"
              maxLength={200}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/200자</p>
          </div>

          {/* 이메일 공개 여부 */}
          <div>
            <label className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-semibold text-gray-700 mb-1">
                  이메일 공개
                </span>
                <span className="text-xs text-gray-500">
                  다른 사용자에게 이메일 주소를 공개합니다
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEmailPublic(!emailPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailPublic ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
