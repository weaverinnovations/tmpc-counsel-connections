import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          TMCP Counsel Connections
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Texas Minority Counsel Program — Attorney Interview Scheduling
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle>Corporation Portal</CardTitle>
            <CardDescription>
              Register your company, select interview slots, and choose
              attorneys for your Counsel Connections schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sign-in">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>
              Manage events, attorney rosters, company invitations, and
              assignment schedules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/sign-in">
              <Button variant="outline" className="w-full">
                Admin Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <p className="mt-12 text-sm text-slate-500">
        © {new Date().getFullYear()} Texas Minority Counsel Program
      </p>
    </div>
  );
}
