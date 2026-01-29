import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { CommentSection } from '@/components/CommentSection';
import { Heart, Share2, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  views_count: number;
  author_id: string;
  is_public: boolean;
  cover_image?: string;
  profiles: {
    nickname: string;
    email: string;
  };
}

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 게시글 불러오기
  useEffect(() => {
    if (id) {
      fetchPost();
      incrementViewCount();
    }
  }, [id]);

  // 좋아요 상태 확인
  useEffect(() => {
    if (id && user) {
      checkLikeStatus();
    }
  }, [id, user]);

  const fetchPost = async () => {
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

      // 비공개 게시글은 작성자만 볼 수 있음
      if (!data.is_public && data.author_id !== user?.id) {
        toast.error('비공개 게시글입니다.');
        navigate('/');
        return;
      }

      // 작성자 정보 가져오기
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nickname, email')
        .eq('id', data.author_id)
        .single();

      // 게시글에 작성자 정보 추가
      const postWithProfile = {
        ...data,
        profiles: profileData || { nickname: '알 수 없음', email: '' },
      };

      setPost(postWithProfile);
      
      // 좋아요 수 가져오기
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);
      
      setLikesCount(count || 0);
    } catch (error) {
      console.error('게시글 불러오기 오류:', error);
      toast.error('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const checkLikeStatus = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', user.id)
      .single();

    setIsLiked(!!data);
  };

  const incrementViewCount = async () => {
    if (!id) return;

    await supabase.rpc('increment_view_count', { post_id: id }).catch(() => {
      // RPC 함수가 없으면 직접 업데이트
      supabase
        .from('posts')
        .update({ views_count: supabase.rpc('views_count + 1') })
        .eq('id', id);
    });
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      } else {
        // 좋아요 (중복 체크는 unique 제약조건으로 처리)
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: id,
            user_id: user.id,
          });

        if (error) {
          // 이미 좋아요한 경우
          if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
            toast.error('이미 좋아요를 눌렀습니다.');
          } else {
            throw error;
          }
          setIsLiking(false);
          return;
        }

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    try {
      await navigator.clipboard.writeText(url);
      toast.success('링크가 복사되었습니다!');
    } catch (error) {
      console.error('링크 복사 오류:', error);
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const handleEdit = () => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('게시글이 삭제되었습니다.');
      navigate('/');
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      toast.error('게시글 삭제 중 오류가 발생했습니다.');
      setIsDeleting(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const isAuthor = user?.id === post.author_id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <article className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 md:p-12">
          {/* 헤더 영역 */}
          <header className="mb-8 pb-8 border-b">
            {/* 제목 */}
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* 작성자 정보 */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <Link
                to={`/profile/${post.author_id}`}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                {/* 프로필 사진 */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {post.profiles?.nickname
                    ? post.profiles.nickname[0].toUpperCase()
                    : 'U'}
                </div>
                <div>
                  <p className="font-medium text-lg">
                    {post.profiles?.nickname || post.profiles?.email}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {formatDate(post.created_at)}
                  </p>
                </div>
              </Link>

              {/* 내가 쓴 글이면 수정/삭제 버튼 */}
              {isAuthor && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </Button>
                </div>
              )}
            </div>

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {post.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* 대표 이미지 */}
          {post.cover_image && (
            <div className="mb-8 -mx-12 md:-mx-12">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full max-h-[500px] object-cover rounded-lg"
              />
            </div>
          )}

          {/* 본문 */}
          <div className="prose prose-lg max-w-none mb-8">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {post.content}
            </div>
          </div>

          {/* 하단 버튼들 */}
          <footer className="pt-8 border-t">
            <div className="flex items-center gap-4">
              {/* 좋아요 버튼 */}
              <Button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 transition-all ${
                  isLiked
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Heart
                  className={`w-5 h-5 transition-all ${
                    isLiked ? 'fill-current animate-like-bounce' : ''
                  }`}
                />
                <span className="font-semibold">{likesCount}</span>
              </Button>

              {/* 공유 버튼 */}
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                공유
              </Button>
            </div>
          </footer>

          {/* 댓글 섹션 */}
          <CommentSection postId={id!} />
        </div>
      </article>

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
