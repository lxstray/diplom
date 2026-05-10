'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Code2, BookOpen, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Redirect to sign in or show landing page
        return;
      }
      // Redirect to tasks page for authenticated users
      router.push('/tasks');
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Diplom</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/tasks">
                <Button variant="outline">Перейти к задачам</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Учитесь программировать вместе в реальном времени
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Решайте задачи, сотрудничайте с другими и отслеживайте свой прогресс
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/tasks">
              <Button size="lg" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Перейти к задачам
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-card border">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Программистские задачи</h3>
            <p className="text-muted-foreground">
              Практикуйтесь на сотнях JavaScript-упражнений из Exercism
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card border">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Совместное редактирование</h3>
            <p className="text-muted-foreground">
              Пишите код вместе в реальном времени с CRDT-синхронизацией
            </p>
          </div>
          <div className="text-center p-6 rounded-lg bg-card border">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">Отслеживайте прогресс</h3>
            <p className="text-muted-foreground">
              Следите за ростом с детальной статистикой и графиками активности
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
