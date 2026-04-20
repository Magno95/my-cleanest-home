import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { AuthState } from './lib/auth.js';
import { AppShell } from './components/app-shell.js';
import { PublicLayout } from './routes/public-layout.js';
import { SignInPage } from './routes/sign-in-page.js';
import { SignUpPage } from './routes/sign-up-page.js';
import { HomeDashboardPage } from './routes/home-dashboard-page.js';
import { ProfilePage } from './routes/profile-page.js';
import { HomeDetailPage } from './routes/home-detail-page.js';
import { RoomDetailPage } from './routes/room-detail-page.js';
import { CleaningItemsPage } from './routes/cleaning-items-page.js';
import { SettingsPage } from './routes/settings-page.js';

export interface RouterContext {
  auth: AuthState;
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: function RootComponent() {
    return <Outlet />;
  },
});

/** Layout + guard: only for signed-out visitors. Signed-in users bounce home. */
const publicLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_public',
  component: PublicLayout,
  beforeLoad: ({ context }) => {
    if (context.auth.session) {
      throw redirect({ to: '/' });
    }
  },
});

const signInRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/signin',
  component: SignInPage,
});

const signUpRoute = createRoute({
  getParentRoute: () => publicLayoutRoute,
  path: '/signup',
  component: SignUpPage,
});

/** Layout + guard: requires a session. Signed-out users bounce to /signin. */
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_auth',
  component: AppShell,
  beforeLoad: ({ context, location }) => {
    if (!context.auth.session) {
      throw redirect({
        to: '/signin',
        search: { redirect: location.href },
      });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/',
  component: HomeDashboardPage,
});

const profileRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/profile',
  component: ProfilePage,
});

const cleaningItemsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/items',
  component: CleaningItemsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/settings',
  component: SettingsPage,
});

const homeDetailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/homes/$homeId',
  component: HomeDetailPage,
});

const roomDetailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/homes/$homeId/rooms/$roomId',
  component: RoomDetailPage,
});

const routeTree = rootRoute.addChildren([
  publicLayoutRoute.addChildren([signInRoute, signUpRoute]),
  authLayoutRoute.addChildren([
    dashboardRoute,
    profileRoute,
    cleaningItemsRoute,
    settingsRoute,
    homeDetailRoute,
    roomDetailRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  // Placeholder context; the real `auth` + `queryClient` come from <RouterProvider context=…>.
  context: {
    auth: { session: undefined, user: null },
    queryClient: undefined as unknown as QueryClient,
  },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
