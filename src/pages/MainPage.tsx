import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { PostCardSkeleton } from '@/components/PostCardSkeleton';
import toast from 'react-hot-toast';

type SortOption = 'latest' | 'popular';

interface Post {
  id: string;
  title: string;
  content: string;
  slug: string;
  tags: string[];
  created_at: string;
  views_count: number;
  author_id: string;
  profiles: {
    nickname: string;
    email: string;
  };
}

interface PostWithStats extends Post {
  likes_count: number;
  comments_count: number;
  author: {
    id: string;
    nickname: string;
    email: string;
  };
}

const POSTS_PER_PAGE = 12;

export function MainPage() {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [page, setPage] = useState(0);
  
  const observer = useRef<IntersectionObserver>();
  const lastPostRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();
      
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      
      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  // 게시글 불러오기
  const fetchPosts = async (pageNum: number, sort: SortOption, reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // 1. 기본 게시글 쿼리 (공개된 게시글만)
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_public', true)
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      // 정렬
      if (sort === 'latest') {
        query = query.order('created_at', { ascending: false });
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) {
        console.error('게시글 불러오기 에러:', postsError);
        toast.error('게시글을 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      if (!postsData || postsData.length === 0) {
        setHasMore(false);
        if (reset) setPosts([]);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // 2. 작성자 정보 가져오기
      const authorIds = [...new Set(postsData.map((post) => post.author_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname, email')
        .in('id', authorIds);

      const profilesMap: { [key: string]: { id: string; nickname: string; email: string } } = {};
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap[profile.id] = {
            id: profile.id,
            nickname: profile.nickname,
            email: profile.email,
          };
        });
      }

      // 3. 각 게시글의 좋아요 수와 댓글 수 가져오기
      const postIds = postsData.map((post) => post.id);

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

      // 좋아요 수 계산
      const likesCount: { [key: string]: number } = {};
      if (likesResult.data) {
        likesResult.data.forEach((like) => {
          likesCount[like.post_id] = (likesCount[like.post_id] || 0) + 1;
        });
      }

      // 댓글 수 계산
      const commentsCount: { [key: string]: number } = {};
      if (commentsResult.data) {
        commentsResult.data.forEach((comment) => {
          commentsCount[comment.post_id] = (commentsCount[comment.post_id] || 0) + 1;
        });
      }

      // 데이터 조합
      const postsWithStats: PostWithStats[] = postsData.map((post) => ({
        ...post,
        likes_count: likesCount[post.id] || 0,
        comments_count: commentsCount[post.id] || 0,
        author: profilesMap[post.author_id] || {
          id: post.author_id,
          nickname: '알 수 없음',
          email: '',
        },
      }));

      // 인기순 정렬
      if (sort === 'popular') {
        postsWithStats.sort((a, b) => {
          const scoreA = (a.likes_count || 0) + (a.comments_count || 0);
          const scoreB = (b.likes_count || 0) + (b.comments_count || 0);
          return scoreB - scoreA;
        });
      }

      if (reset) {
        setPosts(postsWithStats);
      } else {
        setPosts((prev) => [...prev, ...postsWithStats]);
      }

      setHasMore(postsData.length === POSTS_PER_PAGE);
    } catch (error) {
      console.error('게시글 불러오기 오류:', error);
      toast.error('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 초기 로딩
  useEffect(() => {
    fetchPosts(0, sortBy, true);
    setPage(0);
  }, [sortBy]);

  // 페이지 변경 시 추가 로딩
  useEffect(() => {
    if (page > 0) {
      fetchPosts(page, sortBy, false);
    }
  }, [page]);

  // 정렬 변경
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setPosts([]);
    setHasMore(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">최신 게시글</h1>
          
          {/* 정렬 옵션 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('latest')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                sortBy === 'latest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              최신순
            </button>
            <button
              onClick={() => handleSortChange('popular')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                sortBy === 'popular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              인기순
            </button>
          </div>
        </div>

        {/* 게시글 그리드 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <PostCardSkeleton key={index} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">게시글이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => {
                if (index === posts.length - 1) {
                  return (
                    <div key={post.id} ref={lastPostRef}>
                      <PostCard post={post} />
                    </div>
                  );
                }
                return <PostCard key={post.id} post={post} />;
              })}
            </div>

            {/* 로딩 더보기 */}
            {loadingMore && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <PostCardSkeleton key={`loading-${index}`} />
                ))}
              </div>
            )}

            {/* 더 이상 없음 */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">모든 게시글을 불러왔습니다.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
