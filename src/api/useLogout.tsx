import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const useLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;

      // Local cleanup
      localStorage.clear();
      sessionStorage.clear();

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });

      // Redirect after cleanup
      setTimeout(() => {
        navigate("/login");
      }, 300);
    } catch (err: any) {
      console.error("Logout error:", err);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return handleLogout;
};

export default useLogout;
