import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface SysUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function Users() {
  const [users, setUsers] = useState<SysUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) {
        toast.error(error.message);
      } else {
        setUsers(data?.users ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">See when each user last accessed the system</p>
      </div>
      <Card>
        <CardHeader><CardTitle>System Users</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users
                  .slice()
                  .sort((a, b) => (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? ""))
                  .map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email ?? "—"}</TableCell>
                      <TableCell>{format(new Date(u.created_at), "PPP")}</TableCell>
                      <TableCell>
                        {u.last_sign_in_at ? (
                          <span title={format(new Date(u.last_sign_in_at), "PPpp")}>
                            {formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
