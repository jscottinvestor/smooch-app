import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
