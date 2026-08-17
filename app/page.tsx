'use client';

import { useState, useMemo } from 'react';
import Sentiment from 'sentiment';
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  MinusCircle, 
  Search, 
  Download, 
  Filter, 
  ArrowUpDown,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

const sentimentAnalyzer = new Sentiment();

interface Post {
  id: string;
  title: string;
  score: number;
  url: string;
  author: string;
  numComments: number;
  sentimentScore: number;
  sentimentType: 'Positive' | 'Negative' | 'Neutral';
}

export default function Home() {
  const [subreddit, setSubreddit] = useState('technology');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New Filter & Sort States
  const [filterType, setFilterType] = useState<'All' | 'Positive' | 'Negative' | 'Neutral'>('All');
  const [sortBy, setSortBy] = useState<'score' | 'sentiment' | 'comments'>('score');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanSub = subreddit.trim().replace(/^r\//, '');
      
      // FIXED: Call internal Next.js API route to bypass CORS
      const res = await fetch(`/api/reddit?subreddit=${cleanSub}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Subreddit not found, private, or invalid name!');
      }

      if (!data.data || !data.data.children) {
        throw new Error('No posts found in this subreddit.');
      }

      const parsedPosts: Post[] = data.data.children.map((child: any) => {
        const title = child.data.title;
        const analysis = sentimentAnalyzer.analyze(title);
        const score = analysis.score;
        
        let sentimentType: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
        if (score > 0) sentimentType = 'Positive';
        else if (score < 0) sentimentType = 'Negative';

        return {
          id: child.data.id,
          title,
          score: child.data.score,
          url: `https://reddit.com${child.data.permalink}`,
          author: child.data.author || 'unknown',
          numComments: child.data.num_comments || 0,
          sentimentScore: score,
          sentimentType,
        };
      });

      setPosts(parsedPosts);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const totalPosts = posts.length;
  const positiveCount = posts.filter(p => p.sentimentType === 'Positive').length;
  const negativeCount = posts.filter(p => p.sentimentType === 'Negative').length;
  const neutralCount = posts.filter(p => p.sentimentType === 'Neutral').length;

  const overallVibe = useMemo(() => {
    if (totalPosts === 0) return { label: 'Neutral', color: 'text-gray-400' };
    if (positiveCount > negativeCount * 1.5) return { label: 'Bullish / Very Positive 🚀', color: 'text-green-400' };
    if (negativeCount > positiveCount * 1.5) return { label: 'Bearish / Toxic ⚠️', color: 'text-red-400' };
    return { label: 'Mixed Vibe ⚖️', color: 'text-yellow-400' };
  }, [posts, positiveCount, negativeCount, totalPosts]);

  // Filtered and Sorted Posts
  const processedPosts = useMemo(() => {
    return posts
      .filter(post => {
        const matchesFilter = filterType === 'All' || post.sentimentType === filterType;
        const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'sentiment') return b.sentimentScore - a.sentimentScore;
        if (sortBy === 'comments') return b.numComments - a.numComments;
        return 0;
      });
  }, [posts, filterType, searchQuery, sortBy]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (posts.length === 0) return;

    const headers = 'ID,Title,Author,Score,Comments,SentimentType,SentimentScore,URL\n';
    const rows = posts.map(p => 
      `"${p.id}","${p.title.replace(/"/g, '""')}","${p.author}",${p.score},${p.numComments},"${p.sentimentType}",${p.sentimentScore},"${p.url}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subreddit}-vibe-report.csv`;
    a.click();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">
            <Flame className="w-8 h-8 text-orange-500 animate-pulse" /> Subreddit Vibe Check
          </h1>
          <p className="text-sm text-slate-400 mt-1">Advanced Real-time Sentiment Intelligence for Reddit Communities</p>
        </div>

        {posts.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm font-medium border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export Report (CSV)
          </button>
        )}
      </div>

      {/* Search Input Form */}
      <form onSubmit={fetchPosts} className="flex flex-col sm:flex-row gap-3 mb-8 justify-center">
        <div className="flex items-center bg-slate-900 rounded-xl px-4 py-3 border border-slate-800 focus-within:border-orange-500 transition shadow-inner flex-1 max-w-md">
          <span className="text-slate-500 font-mono mr-2">r/</span>
          <input
            type="text"
            value={subreddit}
            onChange={(e) => setSubreddit(e.target.value)}
            className="bg-transparent outline-none text-slate-100 w-full font-medium"
            placeholder="e.g. technology, wallstreetbets, python"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 px-8 py-3 rounded-xl font-semibold transition shadow-lg shadow-orange-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : 'Run Vibe Check'}
        </button>
      </form>

      {error && (
        <div className="bg-red-950/50 border border-red-800/60 p-4 rounded-xl text-red-400 mb-6 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {posts.length > 0 && (
        <>
          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Overall Sentiment</span>
              <p className={`text-lg font-bold mt-1 ${overallVibe.color}`}>{overallVibe.label}</p>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-2xl shadow-sm">
              <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Positive Posts
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{positiveCount}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <MinusCircle className="w-3.5 h-3.5" /> Neutral Posts
              </span>
              <p className="text-2xl font-black text-slate-300 mt-1">{neutralCount}</p>
            </div>
            <div className="bg-rose-950/30 border border-rose-900/50 p-4 rounded-2xl shadow-sm">
              <span className="text-xs text-rose-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" /> Negative Posts
              </span>
              <p className="text-2xl font-black text-rose-400 mt-1">{negativeCount}</p>
            </div>
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {(['All', 'Positive', 'Neutral', 'Negative'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterType(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                    filterType === tab 
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-900/30' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tab} ({tab === 'All' ? posts.length : tab === 'Positive' ? positiveCount : tab === 'Neutral' ? neutralCount : negativeCount})
                </button>
              ))}
            </div>

            {/* Search & Sort */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative flex-1 md:w-48">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter titles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 outline-none focus:border-orange-500 w-full"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-200 outline-none cursor-pointer"
                >
                  <option value="score" className="bg-slate-900">Score</option>
                  <option value="sentiment" className="bg-slate-900">Sentiment</option>
                  <option value="comments" className="bg-slate-900">Comments</option>
                </select>
              </div>
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {processedPosts.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-slate-400">
                <p>No posts found matching your filters.</p>
              </div>
            ) : (
              processedPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-slate-900/70 hover:bg-slate-900 p-4 rounded-2xl border border-slate-800/80 transition flex flex-col sm:flex-row justify-between items-start gap-4 shadow-sm"
                >
                  <div className="space-y-1.5 flex-1">
                    <a 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="font-medium text-slate-100 hover:text-orange-400 transition flex items-start gap-2 group leading-snug"
                    >
                      <span>{post.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-0.5" />
                    </a>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      <span>u/{post.author}</span>
                      <span>•</span>
                      <span>⭐ {post.score} upvotes</span>
                      <span>•</span>
                      <span>💬 {post.numComments} comments</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                    post.sentimentType === 'Positive' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' :
                    post.sentimentType === 'Negative' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {post.sentimentType} ({post.sentimentScore > 0 ? `+${post.sentimentScore}` : post.sentimentScore})
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}