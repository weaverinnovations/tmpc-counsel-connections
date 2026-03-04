import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PortalHome() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Welcome to Counsel Connections</h1>
      <p className="mb-8 text-slate-600">
        Follow the steps below to complete your interview schedule.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>1. Register</CardTitle>
            <CardDescription>
              Complete your company registration with practice areas and contact
              information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/register">
              <Button variant="outline" className="w-full">
                Go to Registration
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Add Interviewers</CardTitle>
            <CardDescription>
              Add your in-house attorneys who will conduct the interviews.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/interviewers">
              <Button variant="outline" className="w-full">
                Manage Interviewers
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Schedule Interviews</CardTitle>
            <CardDescription>
              Select time slots and choose attorneys for each interview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/schedule">
              <Button variant="outline" className="w-full">
                Go to Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
