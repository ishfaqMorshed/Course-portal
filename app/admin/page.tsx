import { redirect } from "next/navigation";

// /admin → land on Analytics (the admin dashboard home). Admins are routed here
// straight after login (LoginScreen → router.push("/admin")).
export default function AdminIndex() {
  redirect("/admin/analytics");
}
