import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Edit, Eye, Heart, MessageCircle, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  nickname: string;
  bio: string | null;
  email: string;
  email_public: boolean;
  profile_image: string | null;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  views_count: number;
  is_public: boolean;
  tags: string[];
}

interface PostWithStats extends Post {
  likes_count: number;
  comments_count: number;
}

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('프로필 불러오기 오류:', error);
      toast.error('프로필을 불러올 수 없습니다.');
    }
  };

  const fetchUserPosts = async () => {
    setLoading(true);

    try {
      // 본인 프로필: 모든 글, 다른 사람: 공개 글만
      const query = supabase
        .from('posts')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

      if (!isOwnProfile) {
        query.eq('is_public', true);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map((post) => post.id);

      // 통계 정보 가져오기
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds),
      ]);

      const likesCount: { [key: string]: number } = {};
      if (likesResult.data) {
        likesResult.data.forEach((like) => {
          likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
        });
      }

      const commentsCount: { [key: string]: number } = {};
      if (commentsResult.data) {
        commentsResult.data.forEach((comment) => {
          commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
        });
      }

      const postsWithStats: PostWithStats[] = postsData.map((post) => ({
        ...post,
        likes_count: likesCount[post.id] || 0,
        comments_count: commentsCount[post.id] || 0,
      }));

      setPosts(postsWithStats);

      // 받은 좋아요 총합
      const totalLikesCount = postsWithStats.reduce(
        (sum, post) => sum + (post.likes_count || 0),
        0
      );
      setTotalLikes(totalLikesCount);
    } catch (error) {
      console.error('게시글 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (postId: string) => {
    setPostToDelete(postId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postToDelete);

      if (error) throw error;

      toast.success('게시글이 삭제되었습니다.');
      setPosts((prev) => prev.filter((post) => post.id !== postToDelete));
      setDeleteModalOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      toast.error('게시글 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!profile) {
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 프로필 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              {/* 프로필 섹션 */}
              <div className="flex flex-col items-center text-center pb-6 border-b">
                {/* 프로필 사진 */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden mb-4">
                  {profile.profile_image ? (
                    <img
                      src={profile.profile_image}
                      alt={profile.nickname}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{profile.nickname[0].toUpperCase()}</span>
                  )}
                </div>

                {/* 내 정보 */}
                <h2 className="text-2xl font-bold mb-1">{profile.nickname}</h2>
                {profile.email_public && (
                  <p className="text-gray-600 text-sm mb-2">{profile.email}</p>
                )}
                {profile.bio && (
                  <p className="text-gray-700 text-sm italic mb-2">
                    "{profile.bio}"
                  </p>
                )}
                <p className="text-gray-500 text-xs">
                  가입일: {new Date(profile.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>

              {/* 통계 정보 */}
              <div className="py-4 border-b">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">통계</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {posts.length}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">작성한 글</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {totalLikes}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">받은 좋아요</div>
                  </div>
                </div>
              </div>

              {/* 프로필 편집 버튼 (본인만) */}
              {isOwnProfile && (
                <div className="pt-4">
                  <Button
                    onClick={() => setEditModalOpen(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    프로필 편집
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 작성한 글 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {isOwnProfile ? '내가 작성한 글' : '작성한 글'}
                </h2>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">로딩 중...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">작성한 글이 없습니다.</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="group relative bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-all"
                    >
                      <Link to={`/post/${post.id}`} className="block">
                        <div className="p-5">
                          {/* 제목과 공개/비공개 */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition flex-1">
                              {post.title}
                            </h3>
                            {!post.is_public && (
                              <Lock className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                            )}
                          </div>

                          {/* 작성 날짜 */}
                          <p className="text-sm text-gray-500 mb-3">
                            {formatDate(post.created_at)}
                          </p>

                          {/* 통계 */}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{post.views_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              <span>{post.likes_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments_count}</span>
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* 마우스 올리면 수정/삭제 버튼 (본인만) */}
                      {isOwnProfile && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Link
                            to={`/edit/${post.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-white hover:bg-gray-100"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteClick(post.id);
                            }}
                            className="bg-white text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPostToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* 프로필 편집 모달 (본인만) */}
      {isOwnProfile && profile && (
        <ProfileEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          currentProfile={{
            id: profile.id,
            nickname: profile.nickname,
            bio: profile.bio,
            email_public: profile.email_public,
            profile_image: profile.profile_image,
          }}
          onSuccess={() => {
            fetchProfile();
            setEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
