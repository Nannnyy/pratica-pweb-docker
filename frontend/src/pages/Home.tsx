import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Login from "./Login";
import Index from "./Index";

const Home = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Index /> : <Login />;
};

export default Home;

