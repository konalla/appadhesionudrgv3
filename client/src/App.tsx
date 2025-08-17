import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import "./i18n"; // Import i18n configuration
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Registration from "@/pages/registration";
import PublicRegistration from "@/pages/public-registration";
import Analytics from "@/pages/analytics";
import AdminAnalytics from "@/pages/admin-analytics";
import AnalyticsVisualizations from "@/pages/analytics-visualizations";
import AgentEnrolement from "@/pages/agent-enrolement";
import AddAdherent from "@/pages/add-adherent";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Federations from "@/pages/federations";
import Messages from "@/pages/messages";
import GroupMessages from "@/pages/group-messages";
import Regions from "@/pages/regions";
import Sections from "@/pages/sections";
import MemberCards from "@/pages/member-cards";
import ImportMembers from "@/pages/import-members";
import AdminTools from "@/pages/admin-tools";
import OfflineDemoPage from "@/pages/offline-demo";
import ExtractedPhotosPage from "@/pages/extracted-photos";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ServiceWorkerManager from "./ServiceWorkerManager";
import { OfflineProvider } from "@/contexts/offline-context";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerManager>
        <OfflineProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </OfflineProvider>
      </ServiceWorkerManager>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  const [location] = useLocation();

  // If on login page or public registration page, render directly without layout
  if (location === "/login" || location === "/public-registration") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/public-registration" component={PublicRegistration} />
      </Switch>
    );
  }

  // Otherwise render routes with layout and authentication protection
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <ProtectedRoute component={<Dashboard />} />
        </Route>
        <Route path="/members">
          <ProtectedRoute component={<Members />} />
        </Route>
        <Route path="/members/new"> {/* Add new member form */}
          <ProtectedRoute component={<AddAdherent />} />
        </Route>
        <Route path="/members/edit/:id"> {/* Edit member */}
          <ProtectedRoute component={<Members />} />
        </Route>
        <Route path="/members/:id"> {/* View member details */}
          <ProtectedRoute component={<Members />} />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute component={<Analytics />} />
        </Route>
        <Route path="/analytics/visualizations">
          <ProtectedRoute component={<AnalyticsVisualizations />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/admin-analytics">
          <ProtectedRoute component={<AdminAnalytics />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/agent-enrolement">
          <ProtectedRoute component={<AgentEnrolement />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/federations">
          <ProtectedRoute component={<Federations />} />
        </Route>
        <Route path="/settings">
          <ProtectedRoute component={<Settings />} />
        </Route>
        <Route path="/messages">
          <ProtectedRoute component={<Messages />} />
        </Route>
        <Route path="/group-messages">
          <ProtectedRoute component={<Messages />} />
        </Route>
        <Route path="/regions">
          <ProtectedRoute component={<Regions />} />
        </Route>
        <Route path="/sections">
          <ProtectedRoute component={<Sections />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/member-cards">
          <ProtectedRoute component={<MemberCards />} />
        </Route>
        <Route path="/add-adherent">
          <ProtectedRoute component={<AddAdherent />} />
        </Route>
        <Route path="/import-members">
          <ProtectedRoute component={<ImportMembers />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/admin-tools">
          <ProtectedRoute component={<AdminTools />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route path="/offline-demo">
          <ProtectedRoute component={<OfflineDemoPage />} />
        </Route>
        <Route path="/extracted-photos">
          <ProtectedRoute component={<ExtractedPhotosPage />} roles={["system_admin", "sysadmin"]} />
        </Route>
        <Route>
          <ProtectedRoute component={<NotFound />} />
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;
