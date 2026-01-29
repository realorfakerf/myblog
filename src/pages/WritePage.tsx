import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateUniqueSlug } from '@/lib/slugify';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import toast from 'react-hot-toast';

export function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [slug, setSlug] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 제목이 변경될 때마다 slug 자동 생성
  useEffect(() => {
    if (title) {
      const generatedSlug = generateUniqueSlug(title);
      setSlug(generatedSlug);
    }
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    // 유효성 검사
    if (title.trim().length < 2) {
      toast.error('제목은 2자 이상 입력해주세요.');
      return;
    }

    if (content.trim().length < 10) {
      toast.error('내용은 10자 이상 입력해주세요.');
      return;
    }

    // 태그 처리
    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5); // 최대 5개

    if (tagArray.length > 5) {
      toast.error('태그는 최대 5개까지 입력할 수 있습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          content: content.trim(),
          slug,
          tags: tagArray,
          is_public: isPublic,
          cover_image: coverImage || null,
          author_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('게시글 작성 에러:', error);
        
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          toast.error('이미 사용 중인 URL입니다. 제목을 수정해주세요.');
        } else {
          toast.error('게시글 작성 중 오류가 발생했습니다.');
        }
        setIsLoading(false);
        return;
      }

      toast.success('게시글이 발행되었습니다!');
      setTimeout(() => {
        navigate(`/post/${data.id}`);
      }, 500);
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      toast.error('게시글 작성 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (
      title.trim() ||
      content.trim() ||
      tags.trim()
    ) {
      if (window.confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* 상단 버튼과 설정 */}
          <div className="bg-white rounded-t-lg shadow px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="min-w-[100px]"
              >
                {isLoading ? '발행 중...' : '발행하기'}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isLoading}
              >
                취소
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {/* 공개/비공개 스위치 */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="public-switch"
                  className="text-sm font-medium cursor-pointer"
                >
                  {isPublic ? '공개' : '비공개'}
                </label>
                <button
                  id="public-switch"
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 에디터 영역 */}
          <div className="bg-white shadow rounded-b-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* 제목 */}
              <div>
                <input
                  type="text"
                  placeholder="제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-4xl font-bold border-none outline-none placeholder-gray-300"
                  required
                />
              </div>

              {/* URL 슬러그 미리보기 */}
              {slug && (
                <div className="text-sm text-gray-500 border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <span className="font-medium">URL:</span> /post/{slug}
                </div>
              )}

              {/* 대표 이미지 업로드 */}
              <ImageUpload
                onImageUploaded={(url) => setCoverImage(url)}
                currentImageUrl={coverImage}
                onImageRemoved={() => setCoverImage('')}
              />

              {/* 태그 */}
              <div>
                <input
                  type="text"
                  placeholder="태그를 입력하세요 (쉼표로 구분, 최대 5개)"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  예: React, TypeScript, Supabase
                  {tags && (
                    <span className="ml-2">
                      (현재: {tags.split(',').filter((t) => t.trim()).length}/5)
                    </span>
                  )}
                </p>
              </div>

              {/* 구분선 */}
              <div className="border-t border-gray-200"></div>

              {/* 내용 에디터 */}
              <div>
                <textarea
                  placeholder="당신의 이야기를 들려주세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[500px] text-lg leading-relaxed"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {content.length} 자
                </p>
              </div>
            </form>
          </div>

          {/* 하단 안내 */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              {isPublic
                ? '게시글은 모든 사용자에게 공개됩니다.'
                : '비공개 게시글은 본인만 볼 수 있습니다.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
