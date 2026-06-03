import React, { useState, useEffect } from 'react';
import { useWorld } from '@/context/WorldContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Newspaper, Loader2 } from 'lucide-react';

export const StoriesPage = () => {
  const { currentWorld } = useWorld();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentWorld) {
      navigate('/worlds');
      return;
    }
    fetchStories();
  }, [currentWorld]);

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/worlds/${currentWorld.id}/stories`);
      setStories(response.data);
    } catch (error) {
      console.error('Failed to fetch stories');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#00F0FF]" />
      </div>
    );
  }

  const storyColors = {
    startup: '#00FF66',
    political: '#FF003C',
    romance: '#FFB000',
    rivalry: '#00F0FF',
    crime: '#FF003C',
    economic: '#00F0FF'
  };

  return (
    <div className="min-h-screen p-6" data-testid="stories-page">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-2">EMERGENT STORIES</h1>
          <p className="text-[#8C92A6]">AI-generated narratives from agent interactions</p>
        </div>

        {stories.length === 0 ? (
          <Card className="glass-panel">
            <CardContent className="py-12 text-center">
              <Newspaper className="w-16 h-16 text-[#00F0FF]/30 mx-auto mb-4" />
              <p className="text-[#8C92A6]">
                No stories yet. As agents interact and make decisions, interesting narratives will emerge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stories.map((story) => (
              <Card
                key={story.id}
                data-testid={`story-card-${story.id}`}
                className="glass-panel hover:border-[#00F0FF]/40 transition-all"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <CardTitle className="text-2xl font-bold text-white flex-1">
                      {story.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="text-xs capitalize"
                      style={{
                        borderColor: `${storyColors[story.story_type] || '#00F0FF'}40`,
                        color: storyColors[story.story_type] || '#00F0FF'
                      }}
                    >
                      {story.story_type}
                    </Badge>
                  </div>
                  <CardDescription className="text-[#8C92A6] text-sm">
                    {new Date(story.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-white leading-relaxed">{story.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
