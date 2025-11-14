import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Bookmark, Loader2 } from "lucide-react";
import { Camera as CapCamera, CameraResultType } from "@capacitor/camera";
import { format } from "date-fns";

export default function AlignmentDetail() {
  const { id } = useParams();
  const [alignment, setAlignment] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAlignment();
  }, [id]);

  const loadAlignment = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_alignments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAlignment(data);
      setNotes(data.notes || "");
    } catch (error) {
      console.error('Error loading alignment:', error);
      toast({
        variant: "destructive",
        title: "Error loading alignment",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_alignments')
        .update({ notes })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Notes saved",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving notes",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
      });

      toast({
        title: "Photo captured",
        description: "Photo functionality will be fully implemented with storage integration.",
      });
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      const { error } = await supabase
        .from('daily_alignments')
        .update({ is_bookmarked: !alignment.is_bookmarked })
        .eq('id', id);

      if (error) throw error;
      setAlignment({ ...alignment, is_bookmarked: !alignment.is_bookmarked });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!alignment) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/history")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleBookmark}>
            <Bookmark
              className={`h-5 w-5 ${
                alignment.is_bookmarked ? 'fill-primary text-primary' : ''
              }`}
            />
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{format(new Date(alignment.date), 'MMMM d, yyyy')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Intention</p>
              <p className="text-2xl font-medium">{alignment.intention}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Emotion</p>
              <p className="text-2xl font-medium">{alignment.emotion}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes & Reflections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your thoughts, reflections, or how you embodied your alignment today..."
              className="min-h-32"
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveNotes} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Notes"
                )}
              </Button>
              <Button onClick={handleAddPhoto} variant="outline">
                <Camera className="mr-2 h-4 w-4" />
                Add Photo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
