import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Manage Counsel Connections events</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-700">—</p>
            <p className="text-sm text-slate-500">No events yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attorneys</CardTitle>
            <CardDescription>Registered outside counsel</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-700">—</p>
            <p className="text-sm text-slate-500">Upload a roster to begin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
            <CardDescription>Participating corporations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-700">—</p>
            <p className="text-sm text-slate-500">Invite companies to join</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
