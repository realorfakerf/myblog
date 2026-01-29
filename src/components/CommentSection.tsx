import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  profiles: {
    nickname: string;
    email: string;
  };
  likes_count: number;
  is_liked: boolean;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
}

const COMMENTS_PER_PAGE = 20;

export function CommentSection({ postId }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // 댓글 작성
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 댓글 수정
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // 답글 작성
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    fetchComments(0, true);
  }, [postId]);

  // 댓글 불러오기 (삭제된 댓글도 포함, 표시만 다르게)
  const fetchComments = async (pageNum: number, reset = false) => {
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .range(pageNum * COMMENTS_PER_PAGE, (pageNum + 1) * COMMENTS_PER_PAGE - 1);

      if (error) throw error;

      if (!commentsData || commentsData.length === 0) {
        setHasMore(false);
        if (reset) setComments([]);
        setLoading(false);
        return;
      }

      // 작성자 정보 가져오기
      const commentIds = commentsData.map((c) => c.id);
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];

      const [profilesResult, likesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nickname, email')
          .in('id', userIds),
        supabase
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds),
      ]);

      const profilesMap: { [key: string]: { nickname: string; email: string } } = {};
      if (profilesResult.data) {
        profilesResult.data.forEach((p) => {
          profilesMap[p.id] = { nickname: p.nickname, email: p.email };
        });
      }

      const likesCount: { [key: string]: number } = {};
      const userLikes = new Set<string>();

      if (likesResult.data) {
        likesResult.data.forEach((like) => {
          likesCount[like.comment_id] = (likesCount[like.comment_id] || 0) + 1;
          if (user && like.user_id === user.id) {
            userLikes.add(like.comment_id);
          }
        });
      }

      const commentsWithStats: Comment[] = commentsData.map((comment) => ({
        ...comment,
        profiles: profilesMap[comment.user_id] || { nickname: '알 수 없음', email: '' },
        likes_count: likesCount[comment.id] || 0,
        is_liked: userLikes.has(comment.id),
      }));

      // 댓글을 계층 구조로 정리 (부모 댓글 + 답글)
      const topLevelComments = commentsWithStats.filter((c) => !c.parent_comment_id);
      const repliesMap: { [key: string]: Comment[] } = {};

      commentsWithStats
        .filter((c) => c.parent_comment_id)
        .forEach((reply) => {
          if (!repliesMap[reply.parent_comment_id!]) {
            repliesMap[reply.parent_comment_id!] = [];
          }
          repliesMap[reply.parent_comment_id!].push(reply);
        });

      // 답글을 부모 댓글에 추가
      const commentsWithReplies = topLevelComments.map((comment) => ({
        ...comment,
        replies: repliesMap[comment.id] || [],
      }));

      if (reset) {
        setComments(commentsWithReplies);
      } else {
        setComments((prev) => [...prev, ...commentsWithReplies]);
      }

      setHasMore(commentsData.length === COMMENTS_PER_PAGE);
    } catch (error) {
      console.error('댓글 불러오기 오류:', error);
      toast.error('댓글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (newComment.trim().length === 0) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    if (newComment.length > 1000) {
      toast.error('댓글은 1000자 이내로 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
        parent_comment_id: null,
      });

      if (error) throw error;

      toast.success('댓글이 작성되었습니다!');
      setNewComment('');
      
      // 댓글 목록 새로고침
      fetchComments(0, true);
      setPage(0);
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      toast.error('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 답글 작성
  const handleSubmitReply = async (parentCommentId: string, _parentNickname: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (replyContent.trim().length === 0) {
      toast.error('답글 내용을 입력해주세요.');
      return;
    }

    if (replyContent.length > 1000) {
      toast.error('답글은 1000자 이내로 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: replyContent.trim(),
        parent_comment_id: parentCommentId,
      });

      if (error) throw error;

      toast.success('답글이 작성되었습니다!');
      setReplyContent('');
      setReplyingToCommentId(null);
      
      // 댓글 목록 새로고침
      fetchComments(0, true);
      setPage(0);
    } catch (error: any) {
      console.error('답글 작성 오류:', error);
      if (error.message?.includes('최대 2단계')) {
        toast.error('답글은 최대 2단계까지만 가능합니다.');
      } else {
        toast.error('답글 작성 중 오류가 발생했습니다.');
      }
    }
  };

  // 답글 버튼 클릭
  const handleReplyClick = (commentId: string, nickname: string) => {
    setReplyingToCommentId(commentId);
    setReplyContent(`@${nickname} `);
  };

  // 댓글 수정
  const handleEditComment = async (commentId: string) => {
    if (editContent.trim().length === 0) {
      toast.error('댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('댓글이 수정되었습니다!');
      setEditingCommentId(null);
      setEditContent('');
      
      // 댓글 목록 새로고침
      fetchComments(0, true);
      setPage(0);
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      toast.error('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  // 댓글 삭제 (soft delete)
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('댓글이 삭제되었습니다.');
      
      // 댓글 상태 업데이트
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, is_deleted: true, deleted_at: new Date().toISOString() }
            : c
        )
      );
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      toast.error('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 댓글 좋아요
  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // 좋아요
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });

        if (error) throw error;
      }

      // 댓글 상태 업데이트
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                is_liked: !isLiked,
                likes_count: isLiked ? c.likes_count - 1 : c.likes_count + 1,
              }
            : c
        )
      );
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      toast.error('좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 더보기
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, false);
  };

  // 상대적 시간
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">
        댓글 <span className="text-blue-600">{comments.length}</span>
      </h2>

      {/* 댓글 입력 */}
      {user ? (
        <div className="mb-8 bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {profile?.nickname ? profile.nickname[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {newComment.length} / 1000자
                </span>
                <Button
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || newComment.trim().length === 0}
                >
                  {isSubmitting ? '작성 중...' : '댓글 작성'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">댓글을 쓰려면 로그인하세요</p>
          <Link to="/login">
            <Button>로그인</Button>
          </Link>
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">첫 번째 댓글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* 프로필 사진 */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {comment.profiles.nickname
                  ? comment.profiles.nickname[0].toUpperCase()
                  : 'U'}
              </div>

              {/* 댓글 내용 */}
              <div className="flex-1">
                {comment.is_deleted ? (
                  // 삭제된 댓글
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-gray-500 italic text-sm">
                      삭제된 댓글입니다
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-semibold text-sm">
                            {comment.profiles.nickname || comment.profiles.email}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {getRelativeTime(comment.created_at)}
                          </span>
                          {comment.updated_at !== comment.created_at && (
                            <span className="text-xs text-gray-400 ml-1">
                              (수정됨)
                            </span>
                          )}
                        </div>

                        {/* 본인 댓글만 수정/삭제 버튼 표시 */}
                        {user?.id === comment.user_id && !comment.is_deleted && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditContent(comment.content);
                              }}
                              className="text-xs text-gray-600 hover:text-blue-600 transition"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs text-gray-600 hover:text-red-600 transition"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 수정 모드 */}
                      {editingCommentId === comment.id ? (
                        <div>
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                            rows={3}
                            maxLength={1000}
                            autoFocus
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {editContent.length} / 1000자
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditComment(comment.id)}
                                disabled={editContent.trim().length === 0}
                              >
                                저장
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditContent('');
                                }}
                              >
                                취소
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                    </div>

                    {/* 좋아요 & 답글 버튼 */}
                    <div className="flex items-center gap-4 mt-2 ml-4">
                      <button
                        onClick={() =>
                          handleLikeComment(comment.id, comment.is_liked)
                        }
                        className={`flex items-center gap-1 text-sm transition ${
                          comment.is_liked
                            ? 'text-red-600 font-medium'
                            : 'text-gray-500 hover:text-red-600'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            comment.is_liked ? 'fill-current' : ''
                          }`}
                        />
                        <span>{comment.likes_count || 0}</span>
                      </button>

                      {/* 답글 버튼 */}
                      <button
                        onClick={() =>
                          handleReplyClick(
                            comment.id,
                            comment.profiles.nickname || '사용자'
                          )
                        }
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>답글</span>
                      </button>
                    </div>

                    {/* 답글 입력창 */}
                    {replyingToCommentId === comment.id && (
                      <div className="mt-4 ml-4 bg-blue-50 rounded-lg p-4">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="답글을 입력하세요..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={3}
                          maxLength={1000}
                          autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {replyContent.length} / 1000자
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSubmitReply(
                                  comment.id,
                                  comment.profiles.nickname || '사용자'
                                )
                              }
                              disabled={replyContent.trim().length === 0}
                            >
                              답글 작성
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReplyingToCommentId(null);
                                setReplyContent('');
                              }}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 답글 목록 */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-4 ml-8 space-y-4 border-l-2 border-gray-200 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            {/* 답글 프로필 사진 */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {reply.profiles.nickname
                                ? reply.profiles.nickname[0].toUpperCase()
                                : 'U'}
                            </div>

                            {/* 답글 내용 */}
                            <div className="flex-1">
                              {reply.is_deleted ? (
                                <div className="bg-gray-100 rounded-lg p-3">
                                  <p className="text-gray-500 italic text-sm">
                                    삭제된 답글입니다
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <span className="font-semibold text-sm">
                                          {reply.profiles.nickname ||
                                            reply.profiles.email}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          {getRelativeTime(reply.created_at)}
                                        </span>
                                        {reply.updated_at !== reply.created_at && (
                                          <span className="text-xs text-gray-400 ml-1">
                                            (수정됨)
                                          </span>
                                        )}
                                      </div>

                                      {user?.id === reply.user_id && (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              setEditingCommentId(reply.id);
                                              setEditContent(reply.content);
                                            }}
                                            className="text-xs text-gray-600 hover:text-blue-600 transition"
                                          >
                                            <Edit className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(reply.id)
                                            }
                                            className="text-xs text-gray-600 hover:text-red-600 transition"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {editingCommentId === reply.id ? (
                                      <div>
                                        <textarea
                                          value={editContent}
                                          onChange={(e) =>
                                            setEditContent(e.target.value)
                                          }
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                                          rows={3}
                                          maxLength={1000}
                                          autoFocus
                                        />
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-500">
                                            {editContent.length} / 1000자
                                          </span>
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() =>
                                                handleEditComment(reply.id)
                                              }
                                              disabled={
                                                editContent.trim().length === 0
                                              }
                                            >
                                              저장
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingCommentId(null);
                                                setEditContent('');
                                              }}
                                            >
                                              취소
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                        {reply.content}
                                      </p>
                                    )}
                                  </div>

                                  {/* 답글의 좋아요 & 답글 버튼 */}
                                  <div className="flex items-center gap-4 mt-2 ml-3">
                                    <button
                                      onClick={() =>
                                        handleLikeComment(reply.id, reply.is_liked)
                                      }
                                      className={`flex items-center gap-1 text-xs transition ${
                                        reply.is_liked
                                          ? 'text-red-600 font-medium'
                                          : 'text-gray-500 hover:text-red-600'
                                      }`}
                                    >
                                      <Heart
                                        className={`w-3 h-3 ${
                                          reply.is_liked ? 'fill-current' : ''
                                        }`}
                                      />
                                      <span>{reply.likes_count || 0}</span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleReplyClick(
                                          comment.id,
                                          reply.profiles.nickname || '사용자'
                                        )
                                      }
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>답글</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 더보기 버튼 */}
      {hasMore && comments.length > 0 && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={handleLoadMore}>
            댓글 더보기
          </Button>
        </div>
      )}
    </div>
  );
}
