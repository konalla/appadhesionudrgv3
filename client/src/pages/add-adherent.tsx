import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import MemberForm from "@/components/members/MemberForm";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export default function AddAdherent() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 px-4 max-w-10xl">
      <ErrorBoundary>
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-primary">{t('members.newMember')}</h2>
          <MemberForm />
        </div>
      </ErrorBoundary>
    </div>
  );
}
