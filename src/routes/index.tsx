import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Users,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Noble Edu - School Management Platform" },
      {
        name: "description",
        content:
          "Streamline attendance tracking, parent communication, and school management for all institutions.",
      },
      { property: "og:title", content: "Noble Edu" },
      {
        property: "og:description",
        content: "School management and parent communication platform.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { currentUser, login } = useStore();
  const navigate = useNavigate();
  const [assignedId, setAssignedId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAssignedId("");
    setPassword("");
  }, []);

  useEffect(() => {
    if (currentUser) navigate({ to: "/app/dashboard" });
  }, [currentUser, navigate]);

  const doLogin = async () => {
    if (!assignedId.trim()) return toast.error("Enter your assigned ID");
    if (!password.trim()) return toast.error("Enter your password");
    setIsLoading(true);
    try {
      const user = await login(assignedId.trim(), password);
      if (!user) {
        toast.error("Invalid ID or password, or account not verified");
        setIsLoading(false);
        return;
      }
      toast.success(`Welcome, ${user.name.split(" ")[0]}`);
      setAssignedId("");
      setPassword("");
      setIsLoading(false);
      navigate({ to: "/app/dashboard" });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !isLoading) doLogin();
  };

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-[24rem] w-[24rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-[12rem] h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_55%)] dark:bg-none" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-foreground">Noble Edu</div>
              <div className="text-xs text-muted-foreground">
                School operations, without the noise
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground border-r pr-4 border-border/60">
              <span className="font-medium text-foreground">Inquiries:</span>
              <a
                href="tel:0786951347"
                className="flex items-center gap-1 hover:text-foreground font-medium"
              >
                <Phone className="h-3.5 w-3.5 text-primary" /> 0786951347
              </a>
              <span>•</span>
              <a
                href="mailto:nobleahimbisibwe5@gmail.com"
                className="flex items-center gap-1 hover:text-foreground font-medium"
              >
                <Mail className="h-3.5 w-3.5 text-primary" /> nobleahimbisibwe5@gmail.com
              </a>
            </div>
            <Button variant="ghost" onClick={scrollToLogin}>
              Sign in
            </Button>
            <Button onClick={scrollToLogin} className="gap-2">
              Open app <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Built for attendance, parent updates, and school reporting
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              A simpler way to run your school.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Track arrivals, send parent updates, manage classes, and keep reports in one clean
              workflow. Noble Edu stays out of the way while the day keeps moving.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={scrollToLogin} className="gap-2">
                Sign in to your account <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToLogin}>
                Use assigned ID
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <MiniMetric icon={CalendarClock} label="Daily attendance" value="Fast check-in" />
              <MiniMetric icon={BellRing} label="Parent alerts" value="Instant updates" />
              <MiniMetric icon={LineChart} label="Reports" value="Ready to print" />
            </div>
          </div>

          <div className="lg:justify-self-end">
            <Card
              ref={loginRef}
              className="overflow-hidden border-border/70 bg-card/95 shadow-[0_30px_80px_-35px_rgba(0,0,0,0.35)]"
            >
              <CardHeader className="space-y-2 border-b border-border/60 bg-muted/35 px-6 py-5">
                <CardTitle className="text-lg">School access</CardTitle>
                <CardDescription>
                  Use the ID and password from your administrator to open your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-id">Assigned ID *</Label>
                    <Input
                      id="login-id"
                      name="login-id"
                      value={assignedId}
                      onChange={(event) => setAssignedId(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. KC001"
                      required
                      disabled={isLoading}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-bwignore="true"
                      data-1p-ignore="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password *</Label>
                    <Input
                      id="login-password"
                      name="login-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter your password"
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-bwignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                    />
                  </div>

                  <Button type="button" onClick={doLogin} className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    For inquiries call{" "}
                    <a
                      href="tel:0786951347"
                      className="font-medium text-foreground hover:underline"
                    >
                      0786951347
                    </a>{" "}
                    or email{" "}
                    <a
                      href="mailto:nobleahimbisibwe5@gmail.com"
                      className="font-medium text-foreground hover:underline"
                    >
                      nobleahimbisibwe5@gmail.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="max-w-xl">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  What it handles
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  The essentials, arranged for real school work.
                </h2>
                <p className="mt-4 leading-7 text-muted-foreground">
                  The goal is not more screens. It is fewer interruptions, clearer records, and less
                  back-and-forth between staff and parents.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={Users}
                  title="Classes and pupils"
                  description="Keep classrooms, pupil records, and parent contacts in a single source of truth."
                />
                <FeatureCard
                  icon={BellRing}
                  title="Parent communication"
                  description="Send important updates without switching tools or duplicating the same message."
                />
                <FeatureCard
                  icon={BarChart3}
                  title="Marks and reporting"
                  description="Prepare clear report cards and summaries when you need them."
                />
                <FeatureCard
                  icon={ShieldCheck}
                  title="Role-based access"
                  description="Give each staff member the access they need and nothing more."
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/35">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GraduationCap className="h-4 w-4 text-primary" />
            Noble Edu
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">For Inquiries:</span>
            <a
              href="tel:0786951347"
              className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline font-medium"
            >
              <Phone className="h-3.5 w-3.5 text-primary" /> 0786951347
            </a>
            <span>•</span>
            <a
              href="mailto:nobleahimbisibwe5@gmail.com"
              className="inline-flex items-center gap-1 text-foreground hover:text-primary hover:underline font-medium"
            >
              <Mail className="h-3.5 w-3.5 text-primary" /> nobleahimbisibwe5@gmail.com
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} Noble Edu. Built for schools that want clarity, not clutter.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
          <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
