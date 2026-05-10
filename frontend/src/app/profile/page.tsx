'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Mail,
  Calendar,
  CheckCircle2,
  Target,
  TrendingUp,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import type { UserTaskStats } from '@/types/task';

interface UserMetadata {
  id: string;
  email: string;
  createdAt: string;
  provider?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { getStats } = useTasks();
  const [user, setUser] = useState<UserMetadata | null>(null);
  const [stats, setStats] = useState<UserTaskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        router.push('/signin');
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email ?? 'Не указан',
        createdAt: session.user.created_at ?? new Date().toISOString(),
        provider: session.user.app_metadata?.provider ?? 'email',
      });
      setLoading(false);
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      getStats().then(setStats).catch(console.error);
    }
  }, [user, getStats]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  const getInitials = (email: string) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const getProviderLabel = (provider?: string) => {
    switch (provider) {
      case 'google':
        return 'Google';
      case 'github':
        return 'GitHub';
      case 'email':
      default:
        return 'Email';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.email.split('@')[0];
  const completionRate =
    stats && stats.totalAttempts > 0
      ? Math.round((stats.totalCompleted / stats.totalAttempts) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к задачам
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile header card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {getInitials(user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-1">{displayName}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    <UserIcon className="h-3 w-3 mr-1" />
                    {getProviderLabel(user.provider)}
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Регистрация: {formatDate(user.createdAt)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Завершено задач</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCompleted ?? 0}</div>
              <p className="text-xs text-muted-foreground">Всего успешных решений</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего попыток</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAttempts ?? 0}</div>
              <p className="text-xs text-muted-foreground">Запусков и отправок</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Процент успеха</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Соотношение завершённых задач
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty breakdown */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Распределение по сложности</CardTitle>
              <CardDescription>
                Количество завершённых задач по уровням
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground flex-1">Лёгкие</span>
                <span className="font-semibold">{stats.difficultyStats.easy}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground flex-1">Средние</span>
                <span className="font-semibold">{stats.difficultyStats.medium}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground flex-1">Сложные</span>
                <span className="font-semibold">{stats.difficultyStats.hard}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация об аккаунте</CardTitle>
            <CardDescription>Базовые данные вашей учётной записи</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">ID пользователя</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Электронная почта</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Способ входа</span>
              <Badge variant="secondary">{getProviderLabel(user.provider)}</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Дата регистрации</span>
              <span className="font-medium">{formatDate(user.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
