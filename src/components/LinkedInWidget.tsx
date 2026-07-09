import React, { useState } from "react";
import { Linkedin, Heart, ThumbsUp, MessageSquare, Share2, Award, ExternalLink, Settings, Edit3, HelpCircle, Check, HelpCircle as CuriousIcon } from "lucide-react";
import { UserAccount } from "../types";

interface LinkedInPost {
  id: string;
  author: string;
  authorTitle: string;
  avatarUrl: string;
  timeAgo: string;
  content: string;
  imageUrl?: string;
  initialLikes: number;
  initialCelebrates: number;
  initialSupports: number;
}

const SAMPLE_POSTS: LinkedInPost[] = [
  {
    id: "post_1",
    author: "Christian Hope Center Syria",
    authorTitle: "1,420 followers • Non-profit Organization Management",
    avatarUrl: "/logo.svg", // Fallback, will show a beautiful red logo with cross
    timeAgo: "2 days ago",
    content: "Hope begins with a single step. Our vocational training program in Aleppo is empowering youth and women with the skills they need to rebuild their lives and careers. From sewing workshops to mobile maintenance, we are seeding hope for the future. We believe that equipping people with practical skills is the key to sustainable restoration. #CHCSyria #Aleppo #HopeRebuilds #VocationalTraining #CommunityRebuilding",
    imageUrl: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=600&auto=format&fit=crop&q=80",
    initialLikes: 42,
    initialCelebrates: 18,
    initialSupports: 15
  },
  {
    id: "post_2",
    author: "Christian Hope Center Syria",
    authorTitle: "1,420 followers • Non-profit Organization Management",
    avatarUrl: "/logo.svg",
    timeAgo: "1 week ago",
    content: "Providing vital support where it's needed most. Our teams in Damascus, Hama, and Homs have completed another distribution of essential hygiene kits and winter warmth packs to vulnerable families. Our mission remains: standing together with families in dignity, compassion, and action. Thank you to our dedicated field dispatchers and international partners. #HumanitarianAid #Syria #RebuildingHope #CHCSyria #HopeInAction",
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&auto=format&fit=crop&q=80",
    initialLikes: 58,
    initialCelebrates: 12,
    initialSupports: 24
  },
  {
    id: "post_3",
    author: "Christian Hope Center Syria",
    authorTitle: "1,420 followers • Non-profit Organization Management",
    avatarUrl: "/logo.svg",
    timeAgo: "2 weeks ago",
    content: "Our Micro-Project program in Latakia is live! We are helping local families start their own small businesses—including carpentry workshops, mini-markets, and traditional sewing studios—to achieve self-reliance and dignified livelihoods. Every small business started is a beacon of hope in the community. #Microprojects #Latakia #DignifiedLivelihoods #CHCSyria #SelfReliance #SyriaBusiness",
    imageUrl: "https://images.unsplash.com/photo-1473163928189-364b2c4e1135?w=600&auto=format&fit=crop&q=80",
    initialLikes: 63,
    initialCelebrates: 27,
    initialSupports: 19
  }
];

interface LinkedInWidgetProps {
  currentUser: UserAccount;
  linkedInUrl: string;
  embedCode?: string;
  onSaveLinkedInUrl?: (url: string, code: string) => Promise<boolean>;
}

export default function LinkedInWidget({
  currentUser,
  linkedInUrl,
  embedCode = "",
  onSaveLinkedInUrl
}: LinkedInWidgetProps) {
  const isOwnerOrAdmin = currentUser?.role === "super_admin" || currentUser?.role === "archive_manager";
  
  // Local reactive states for interactions
  const [posts, setPosts] = useState<LinkedInPost[]>(SAMPLE_POSTS);
  const [reactedPosts, setReactedPosts] = useState<Record<string, "like" | "celebrate" | "support" | null>>({});
  
  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(linkedInUrl);
  const [editEmbedCode, setEditEmbedCode] = useState(embedCode);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setEditUrl(linkedInUrl);
  }, [linkedInUrl]);

  React.useEffect(() => {
    setEditEmbedCode(embedCode);
  }, [embedCode]);

  const handleReact = (postId: string, type: "like" | "celebrate" | "support") => {
    const currentReaction = reactedPosts[postId];
    
    setReactedPosts(prev => ({
      ...prev,
      [postId]: currentReaction === type ? null : type
    }));

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      
      let likeDiff = 0;
      let celebDiff = 0;
      let supportDiff = 0;

      // Subtract old reaction if active
      if (currentReaction === "like") likeDiff--;
      if (currentReaction === "celebrate") celebDiff--;
      if (currentReaction === "support") supportDiff--;

      // Add new reaction if it's different
      if (currentReaction !== type) {
        if (type === "like") likeDiff++;
        if (type === "celebrate") celebDiff++;
        if (type === "support") supportDiff++;
      }

      return {
        ...p,
        initialLikes: Math.max(0, p.initialLikes + likeDiff),
        initialCelebrates: Math.max(0, p.initialCelebrates + celebDiff),
        initialSupports: Math.max(0, p.initialSupports + supportDiff)
      };
    }));
  };

  const handleSaveClick = async () => {
    if (!onSaveLinkedInUrl) return;
    setIsSaving(true);
    try {
      const ok = await onSaveLinkedInUrl(editUrl, editEmbedCode);
      if (ok) {
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200/70 dark:border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4 font-sans select-none">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#0077b5] flex items-center justify-center text-white">
            <Linkedin className="w-3 h-3 fill-white" />
          </div>
          <span className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
            LinkedIn Hub
          </span>
        </div>

        {isOwnerOrAdmin && (
          <button 
            onClick={() => {
              setEditUrl(linkedInUrl);
              setIsEditing(!isEditing);
            }}
            className="text-gray-400 hover:text-[#be1f24] dark:hover:text-red-400 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Edit LinkedIn Page Address"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Inline Link Editing Panel (For Admins/Owners) */}
      {isEditing && (
        <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl flex flex-col gap-3 animate-fade-in">
          <div className="text-[10px] text-[#be1f24] dark:text-red-400 font-extrabold uppercase tracking-wide">
            Change LinkedIn Page Target
          </div>
          <p className="text-[9px] text-gray-500 dark:text-zinc-400">
            Provide the profile URL and/or an optional iframe embed code to display live, real-time posts.
          </p>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold">Company URL:</span>
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://linkedin.com/company/..."
              className="w-full text-xs px-2.5 py-1.5 bg-white dark:bg-zinc-950 text-gray-950 dark:text-white rounded-lg border border-gray-250 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#be1f24]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold">Embed Code (Optional iframe/widget):</span>
            <textarea
              value={editEmbedCode}
              onChange={(e) => setEditEmbedCode(e.target.value)}
              placeholder="Paste HTML widget iframe code here..."
              rows={2}
              className="w-full text-[10px] font-mono p-2 bg-white dark:bg-zinc-950 text-gray-950 dark:text-white rounded-lg border border-gray-250 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#be1f24]"
            />
          </div>
          <div className="flex justify-end mt-1">
            <button
              onClick={handleSaveClick}
              disabled={isSaving}
              className="bg-[#be1f24] hover:bg-[#a1161a] text-white rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
            >
              {isSaving ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : "Save Settings"}
            </button>
          </div>
        </div>
      )}
      {embedCode ? (
        <div className="flex flex-col gap-2 mt-1">
          <div 
            className="w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-zinc-950/20 p-2 border border-gray-150 dark:border-zinc-850/60 flex items-center justify-center min-h-[160px]"
            dangerouslySetInnerHTML={{ __html: embedCode }}
          />
          <p className="text-[8px] text-center text-gray-400 font-mono tracking-tight uppercase">
            Rendering dynamic third-party feed widget
          </p>
        </div>
      ) : (
        <>
          {/* Linked Profile Main Header */}
          <div className="flex gap-3 items-center">
            {/* Organization Mini-Logo */}
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex items-center justify-center p-1.5 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full text-[#be1f24]"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-gray-900 dark:text-zinc-100 truncate hover:underline cursor-pointer">
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <span>Christian Hope Center Syria</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                </a>
              </h5>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate font-medium">
                1,420 followers • Damascus, Aleppo, Homs
              </p>
            </div>
          </div>

          {/* Embedded Posts Feed */}
          <div className="flex flex-col gap-4 mt-1 max-h-[360px] overflow-y-auto pr-1.5 scrollbar-thin">
            {posts.map((post) => {
              const userReaction = reactedPosts[post.id];
              const hasLiked = userReaction === "like";
              const hasCelebrated = userReaction === "celebrate";
              const hasSupported = userReaction === "support";
              
              const totalReactions = post.initialLikes + post.initialCelebrates + post.initialSupports;

              return (
                <div 
                  key={post.id}
                  className="bg-gray-50/50 dark:bg-zinc-950/20 border border-gray-100 dark:border-zinc-800/60 p-3 rounded-xl flex flex-col gap-2 transition-all hover:bg-gray-100/30 dark:hover:bg-zinc-950/30"
                >
                  {/* Post Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#be1f24] text-white flex items-center justify-center p-1 font-bold text-[8px]">
                      CHC
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
                          {post.author}
                        </a>
                      </div>
                      <div className="text-[8px] text-gray-400 dark:text-zinc-500 leading-none mt-0.5">
                        {post.timeAgo}
                      </div>
                    </div>
                  </div>

                  {/* Post Text */}
                  <p className="text-[10px] text-gray-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-line line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                    {post.content}
                  </p>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-900 bg-black">
                      <img 
                        src={post.imageUrl} 
                        alt="LinkedIn Post Visual" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center justify-between text-[8px] text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-850/60 pb-1.5 mt-1 font-mono">
                    <div className="flex items-center gap-1 font-bold">
                      <div className="flex -space-x-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white border border-white dark:border-zinc-900">
                          <ThumbsUp className="w-2 h-2 fill-white text-white" />
                        </div>
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white border border-white dark:border-zinc-900">
                          <Award className="w-2 h-2 text-white" />
                        </div>
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white border border-white dark:border-zinc-900">
                          <Heart className="w-2 h-2 fill-white text-white" />
                        </div>
                      </div>
                      <span>{totalReactions} reactions</span>
                    </div>
                    <span>4 comments</span>
                  </div>

                  {/* Interactive Reaction Buttons */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      onClick={() => handleReact(post.id, "like")}
                      className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-black transition-all cursor-pointer ${
                        hasLiked
                          ? "text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                          : "text-gray-500 hover:bg-gray-100/50 dark:hover:bg-zinc-850/50"
                      }`}
                    >
                      <ThumbsUp className={`w-3 h-3 ${hasLiked ? "fill-current" : ""}`} />
                      <span>Like</span>
                    </button>

                    <button
                      onClick={() => handleReact(post.id, "celebrate")}
                      className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-black transition-all cursor-pointer ${
                        hasCelebrated
                          ? "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "text-gray-500 hover:bg-gray-100/50 dark:hover:bg-zinc-850/50"
                      }`}
                    >
                      <Award className={`w-3 h-3 ${hasCelebrated ? "text-emerald-600 fill-emerald-100 dark:fill-emerald-950" : ""}`} />
                      <span>Celebrate</span>
                    </button>

                    <button
                      onClick={() => handleReact(post.id, "support")}
                      className={`py-1 rounded flex items-center justify-center gap-1 text-[9px] font-black transition-all cursor-pointer ${
                        hasSupported
                          ? "text-rose-600 bg-rose-50/50 dark:bg-rose-950/20"
                          : "text-gray-500 hover:bg-gray-100/50 dark:hover:bg-zinc-850/50"
                      }`}
                    >
                      <Heart className={`w-3 h-3 ${hasSupported ? "fill-current text-rose-500" : ""}`} />
                      <span>Support</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Redirect Footer */}
      <a 
        href={linkedInUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-center text-[10px] font-black text-[#be1f24] hover:text-[#a1161a] dark:text-red-400 dark:hover:text-red-300 py-1 hover:underline flex items-center justify-center gap-1 cursor-pointer bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-xl transition-colors mt-1"
      >
        <span>Access Official Community Feed</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
