import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Bookmark, Loader2, Plus, Bell, Edit2, Save, X, Trash2 } from "lucide-react";
import ReflectionForm from "@/components/ReflectionForm";
import StarRating from "@/components/StarRating";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Camera as CapCamera, CameraResultType } from "@capacitor/camera";
import { format } from "date-fns";
import { z } from "zod";

const alignmentEditSchema = z.object({
  intention: z.string().trim().min(1, "Intention is required").max(1000, "Intention must be less than 1000 characters"),
  emotion: z.string().trim().min(1, "Emotion is required").max(1000, "Emotion must be less than 1000 characters"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});


export default function AlignmentDetail() {
  const { id } = useParams();
  const [alignment, setAlignment] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayAlignmentCount, setTodayAlignmentCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIntention, setEditedIntention] = useState("");
  const [editedEmotion, setEditedEmotion] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [reflections, setReflections] = useState<any[]>([]);
  const [canAddReflection, setCanAddReflection] = useState(true);
  const [showBackButton, setShowBackButton] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadAlignment();
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowBackButton(true);
      } else {
        setShowBackButton(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      setEditedIntention(data.intention);
      setEditedEmotion(data.emotion);
      setEditedDate(data.date);

      // Load reflections for this alignment
      const { data: reflectionsData } = await supabase
        .from('alignment_reflections')
        .select('*')
        .eq('alignment_id', id)
        .order('created_at', { ascending: false });

      setReflections(reflectionsData || []);

      // Check if user can add a new reflection (1 hour cooldown)
      if (reflectionsData && reflectionsData.length > 0) {
        const lastReflection = reflectionsData[0];
        const lastReflectionTime = new Date(lastReflection.created_at);
        const oneHourLater = new Date(lastReflectionTime.getTime() + 60 * 60 * 1000);
        setCanAddReflection(Date.now() >= oneHourLater.getTime());
      } else {
        setCanAddReflection(true);
      }

      // Check today's alignment count
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const { data: alignments } = await supabase
          .from('daily_alignments')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today);
        
        setTodayAlignmentCount(alignments?.length || 0);
      }
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

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      console.log('Original editedDate:', editedDate);
      
      const validation = alignmentEditSchema.safeParse({
        intention: editedIntention,
        emotion: editedEmotion,
        date: editedDate,
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      // Ensure date is in YYYY-MM-DD format without any timezone conversion
      // If editedDate already looks like YYYY-MM-DD, use it directly
      let dateOnly = validation.data.date;
      if (dateOnly.includes('T')) {
        dateOnly = dateOnly.split('T')[0];
      }
      
      console.log('Saving date to database:', dateOnly);

      const { error } = await supabase
        .from('daily_alignments')
        .update({
          intention: validation.data.intention,
          emotion: validation.data.emotion,
          date: dateOnly,
        })
        .eq('id', id);

      if (error) throw error;

      setAlignment({
        ...alignment,
        intention: validation.data.intention,
        emotion: validation.data.emotion,
        date: dateOnly,
      });
      setEditedDate(dateOnly);
      setIsEditing(false);

      toast({
        title: "Alignment updated",
      });
      
      // Reload to ensure we have fresh data
      await loadAlignment();
    } catch (error: any) {
      console.error('Error updating alignment:', error);
      toast({
        variant: "destructive",
        title: "Error updating alignment",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedIntention(alignment.intention);
    setEditedEmotion(alignment.emotion);
    setEditedDate(alignment.date);
    setIsEditing(false);
  };

  const toggleBookmark = async () => {
    try {
      const { error } = await supabase
        .from('daily_alignments')
        .update({ is_bookmarked: !alignment.is_bookmarked })
        .eq('id', id);

      if (error) throw error;

      setAlignment({ ...alignment, is_bookmarked: !alignment.is_bookmarked });
      toast({
        title: alignment.is_bookmarked ? "Bookmark removed" : "Bookmarked",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating bookmark",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('daily_alignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Alignment deleted",
      });
      navigate("/history");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting alignment",
        description: error.message,
      });
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
    <div className="min-h-screen bg-gradient-to-br from-primary/15 via-blue-500/10 via-70% to-secondary/20 p-4">
      <div className="container max-w-2xl mx-auto py-8">
        <div className="flex justify-between items-center mb-6 pt-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/history")}
            className={`fixed top-10 left-4 z-50 transition-all duration-300 ${
              showBackButton ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0 pointer-events-none'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleBookmark}>
              <Bookmark
                className={`h-5 w-5 ${
                  alignment.is_bookmarked ? 'fill-primary text-primary' : ''
                }`}
              />
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                {(() => {
                  // Parse date as local date to avoid timezone shifts
                  const [year, month, day] = alignment.date.split('-').map(Number);
                  const localDate = new Date(year, month - 1, day);
                  return format(localDate, 'MMMM d, yyyy');
                })()}
              </CardTitle>
              {!isEditing && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-intention">Intention</Label>
                  <Input
                    id="edit-intention"
                    value={editedIntention}
                    onChange={(e) => setEditedIntention(e.target.value)}
                    placeholder="Your intention..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-emotion">Emotion</Label>
                  <Input
                    id="edit-emotion"
                    value={editedEmotion}
                    onChange={(e) => setEditedEmotion(e.target.value)}
                    placeholder="Your emotion..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleSaveEdit} disabled={saving} className="flex-1">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Intention</p>
                  <p className="text-2xl font-medium">{alignment.intention}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emotion</p>
                  <p className="text-2xl font-medium">{alignment.emotion}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reflection Form */}
        <div className="mb-6">
          <ReflectionForm
            alignmentId={id!}
            onReflectionAdded={loadAlignment}
            canAddReflection={canAddReflection}
            nextReflectionTime={
              reflections.length > 0
                ? new Date(new Date(reflections[0].created_at).getTime() + 60 * 60 * 1000)
                : undefined
            }
          />
        </div>

        <div className="mb-6">
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Alignment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Alignment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your alignment entry.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {todayAlignmentCount < 2 && alignment.date === new Date().toISOString().split('T')[0] && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Create Second Alignment</CardTitle>
              <CardDescription>
                Add another alignment for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => navigate("/create-alignment")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Alignment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
