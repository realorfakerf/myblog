import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ImageUpload';
import toast from 'react-hot-toast';

export function EditPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [_slug, setSlug] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 기존 게시글 불러오기
  useEffect(() => {
    if (id && user) {
      fetchPost();
    }
  }, [id, user]);

  const fetchPost = async () => {
    if (!user) {
      setIsFetching(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('게시글 불러오기 에러:', error);
        toast.error('게시글을 찾을 수 없습니다.');
        navigate('/');
        return;
      }

      // 작성자만 수정 가능
      if (data.author_id !== user.id) {
        toast.error('권한이 없습니다.');
        navigate('/');
        return;
      }

      // 기존 내용 자동으로 채워 넣기
      setTitle(data.title);
      setContent(data.content);
      setTags(data.tags?.join(', ') || '');
      setIsPublic(data.is_public);
      setSlug(data.slug);
      setCoverImage(data.cover_image || '');
    } catch (error) {
      console.error('게시글 불러오기 오류:', error);
      toast.error('게시글을 불러오는 중 오류가 발생했습니다.');
      navigate('/');
    } finally {
      setIsFetching(false);
    }
  };

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
      .slice(0, 5);

    setIsLoading(true);

    try {
      // Supabase에 수정 내용 업데이트
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          tags: tagArray,
          is_public: isPublic,
          cover_image: coverImage || null,
          updated_at: new Date().toISOString(), // 수정한 날짜 기록
        })
        .eq('id', id)
        .eq('author_id', user.id); // 작성자 확인 (보안)

      if (error) {
        console.error('게시글 수정 에러:', error);
        
        // 권한 없음 에러 처리
        if (error.message?.includes('0 rows')) {
          toast.error('권한이 없습니다.');
        } else {
          toast.error('게시글 수정 중 오류가 발생했습니다.');
        }
        setIsLoading(false);
        return;
      }

      toast.success('게시글이 수정되었습니다!', { duration: 2000 });
      
      // 완료되면 글 상세 페이지로 이동
      setTimeout(() => {
        navigate(`/post/${id}`);
      }, 500);
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      toast.error('게시글 수정 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
      navigate(`/post/${id}`);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

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
                {isLoading ? '수정 중...' : '수정 완료'}
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
            <div className="p-6 border-b bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>수정 모드:</strong> 기존 게시글을 수정하고 있습니다.
              </p>
            </div>
            
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
