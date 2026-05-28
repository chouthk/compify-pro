import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getTierByProductId, TierKey } from "@/lib/stripe-tiers";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  subscribed: boolean;
  tier: TierKey;
  subscriptionEnd: string | null;
  refreshSubscription: () => Promise<void>;
  isAdmin: boolean;
  reportCredits: number;
  refreshReportCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  subscribed: false,
  tier: "free",
  subscriptionEnd: null,
  refreshSubscription: async () => {},
  isAdmin: false,
  reportCredits: 0,
  refreshReportCredits: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [tier, setTier] = useState<TierKey>("free");
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [reportCredits, setReportCredits] = useState(0);

  const refreshReportCredits = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).rpc("get_my_report_credit_balance");
      if (!error) setReportCredits(data ?? 0);
    } catch (err) {
      console.error("Failed to check report credits:", err);
    }
  }, []);

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!error && data === true) {
        setIsAdmin(true);
        // Admin gets unlimited access (school tier)
        setTier("school");
        setSubscribed(true);
        return true;
      }
      setIsAdmin(false);
      return false;
    } catch {
      setIsAdmin(false);
      return false;
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
        return;
      }
      setSubscribed(data.subscribed ?? false);
      setTier(getTierByProductId(data.product_id ?? null));
      setSubscriptionEnd(data.subscription_end ?? null);
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    const adminGranted = await checkAdminRole(user.id);
    if (!adminGranted) {
      await checkSubscription();
    }
    await refreshReportCredits();
  }, [user, checkAdminRole, checkSubscription, refreshReportCredits]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          setTimeout(async () => {
            const adminGranted = await checkAdminRole(session.user.id);
            if (!adminGranted) {
              await checkSubscription();
            }
            await refreshReportCredits();
          }, 0);
        } else {
          setSubscribed(false);
          setTier("free");
          setSubscriptionEnd(null);
          setIsAdmin(false);
          setReportCredits(0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkAdminRole(session.user.id).then((adminGranted) => {
          if (!adminGranted) checkSubscription();
          refreshReportCredits();
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole, checkSubscription, refreshReportCredits]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [user, refreshAll]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, subscribed, tier, subscriptionEnd, refreshSubscription: refreshAll, isAdmin, reportCredits, refreshReportCredits }}>
      {children}
    </AuthContext.Provider>
  );
};
