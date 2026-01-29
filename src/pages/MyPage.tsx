import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Eye, Heart, MessageCircle, Edit, Trash2, Camera, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import toast from 'react-hot-toast';

type TabType = 'my-posts' | 'liked-posts';
type SortType = 'latest' | 'popular' | 'views';
type FilterType = 'all' | 'public' | 'private';

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

export function MyPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [likedPosts, setLikedPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  
  // 탭, 정렬, 필터 상태
  const [activeTab, setActiveTab] = useState<TabType>('my-posts');
  const [sortBy, setSortBy] = useState<SortType>('latest');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  
  // 프로필 편집 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (activeTab === 'my-posts') {
        fetchMyPosts();
      } else {
        fetchLikedPosts();
      }
    }
  }, [user, activeTab]);

  const fetchMyPosts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('게시글 불러오기 에러:', postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = postsData.map((post) => post.id);

      // 좋아요 수와 댓글 수 가져오기
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id', { count: 'exact', head: false })
          .in('post_id', postIds),
        supabase
          .from('comments')
          .select('post_id', { count: 'exact', head: false })
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

      // 받은 좋아요 총합 계산
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

  const fetchLikedPosts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 내가 좋아요한 게시글 ID 가져오기
      const { data: likedPostIds, error: likesError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (likesError) {
        console.error('좋아요한 게시글 불러오기 에러:', likesError);
        return;
      }

      if (!likedPostIds || likedPostIds.length === 0) {
        setLikedPosts([]);
        setLoading(false);
        return;
      }

      const postIds = likedPostIds.map((like) => like.post_id);

      // 게시글 정보 가져오기
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('게시글 불러오기 에러:', postsError);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setLikedPosts([]);
        setLoading(false);
        return;
      }

      // 좋아요 수와 댓글 수 가져오기
      const [likesResult, commentsResult] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id', { count: 'exact', head: false })
          .in('post_id', postIds),
        supabase
          .from('comments')
          .select('post_id', { count: 'exact', head: false })
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

      setLikedPosts(postsWithStats);
    } catch (error) {
      console.error('좋아요한 게시글 불러오기 오류:', error);
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

  // 필터링 및 정렬된 게시글 가져오기
  const getFilteredAndSortedPosts = () => {
    const currentPosts = activeTab === 'my-posts' ? posts : likedPosts;
    
    // 필터링 (작성한 글 탭에서만 적용)
    let filtered = currentPosts;
    if (activeTab === 'my-posts') {
      if (filterBy === 'public') {
        filtered = currentPosts.filter((post) => post.is_public);
      } else if (filterBy === 'private') {
        filtered = currentPosts.filter((post) => !post.is_public);
      }
    }
    
    // 정렬
    let sorted = [...filtered];
    if (sortBy === 'latest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count));
    } else if (sortBy === 'views') {
      sorted.sort((a, b) => b.views_count - a.views_count);
    }
    
    return sorted;
  };

  const displayPosts = getFilteredAndSortedPosts();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">마이페이지</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽: 프로필 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              {/* 프로필 섹션 */}
              <div className="flex flex-col items-center text-center pb-6 border-b">
                {/* 프로필 사진 */}
                <div className="relative group mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
                    {profile?.profile_image ? (
                      <img
                        src={profile.profile_image}
                        alt={profile.nickname}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{profile?.nickname ? profile.nickname[0].toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  {/* 마우스 올리면 변경 버튼 */}
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <div className="flex flex-col items-center text-white">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-sm font-medium">변경</span>
                    </div>
                  </button>
                </div>

                {/* 내 정보 */}
                <h2 className="text-2xl font-bold mb-1">
                  {profile?.nickname || '사용자'}
                </h2>
                <p className="text-gray-600 text-sm mb-2">{user?.email}</p>
                {profile?.bio && (
                  <p className="text-gray-700 text-sm italic mb-2">
                    "{profile.bio}"
                  </p>
                )}
                <p className="text-gray-500 text-xs">
                  가입일:{' '}
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('ko-KR')
                    : '-'}
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

              {/* 프로필 편집 버튼 */}
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
            </div>
          </div>

          {/* 오른쪽: 탭과 글 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* 탭 메뉴 */}
              <div className="border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('my-posts')}
                    className={`flex-1 px-6 py-4 font-semibold transition ${
                      activeTab === 'my-posts'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    작성한 글
                  </button>
                  <button
                    onClick={() => setActiveTab('liked-posts')}
                    className={`flex-1 px-6 py-4 font-semibold transition ${
                      activeTab === 'liked-posts'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    좋아요한 글
                  </button>
                </div>
              </div>

              {/* 정렬 및 필터 */}
              <div className="p-4 border-b bg-gray-50 flex flex-wrap items-center gap-4">
                {/* 정렬 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">정렬:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSortBy('latest')}
                      className={`px-3 py-1 text-sm rounded transition ${
                        sortBy === 'latest'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      최신순
                    </button>
                    <button
                      onClick={() => setSortBy('popular')}
                      className={`px-3 py-1 text-sm rounded transition ${
                        sortBy === 'popular'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      인기순
                    </button>
                    <button
                      onClick={() => setSortBy('views')}
                      className={`px-3 py-1 text-sm rounded transition ${
                        sortBy === 'views'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      조회수순
                    </button>
                  </div>
                </div>

                {/* 필터 (작성한 글 탭에서만 표시) */}
                {activeTab === 'my-posts' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">필터:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setFilterBy('all')}
                        className={`px-3 py-1 text-sm rounded transition ${
                          filterBy === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        전체 글
                      </button>
                      <button
                        onClick={() => setFilterBy('public')}
                        className={`px-3 py-1 text-sm rounded transition ${
                          filterBy === 'public'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        공개 글
                      </button>
                      <button
                        onClick={() => setFilterBy('private')}
                        className={`px-3 py-1 text-sm rounded transition ${
                          filterBy === 'private'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        비공개 글
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 게시글 목록 */}
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">로딩 중...</p>
                </div>
              ) : displayPosts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 mb-4">
                    {activeTab === 'my-posts'
                      ? '작성한 글이 없습니다.'
                      : '좋아요한 글이 없습니다.'}
                  </p>
                  {activeTab === 'my-posts' && (
                    <Link to="/write">
                      <Button>첫 글 작성하기</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayPosts.map((post) => (
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

                      {/* 마우스 올리면 수정/삭제 버튼 (작성한 글 탭에서만) */}
                      {activeTab === 'my-posts' && (
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

      {/* 프로필 편집 모달 */}
      {profile && (
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
            // 프로필 정보 새로고침
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
