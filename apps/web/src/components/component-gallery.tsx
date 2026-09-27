'use client';
import { useState } from 'react';
import { Dumbbell, Check, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { NumberInput, DatePicker, SearchInput } from '@myfit/ui/fields';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@myfit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@myfit/ui/dialog';
import { BottomSheet } from '@myfit/ui/bottom-sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@myfit/ui/tabs';
import { Progress } from '@myfit/ui/progress';
import { StatCard, ProgressCircle, EmptyState } from '@myfit/ui/summary';
import { Skeleton } from '@myfit/ui/skeleton';
const exercises = ['Bench Press', 'Squat', 'Deadlift'];
export function ComponentGallery() {
  const [search, setSearch] = useState('');
  const [weight, setWeight] = useState('80');
  const [reps, setReps] = useState('8');
  const results = exercises.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-7">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="예제 지표"
      >
        <StatCard
          title="오늘의 운동 · 예제"
          value="48"
          unit="분"
          description="웨이트 1회"
          icon={<Dumbbell className="size-5" />}
        />
        <Card className="shadow-none">
          <CardContent className="flex items-center gap-5">
            <ProgressCircle value={75} label="주간 운동 목표 예제" />
            <div>
              <h3>주간 운동일</h3>
              <p className="mt-1 text-muted-foreground">3 / 4일 · 예제</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none sm:col-span-2 xl:col-span-1">
          <CardContent>
            <h3>단백질 · 예제</h3>
            <p className="my-3 text-2xl font-semibold tabular-nums">
              120{' '}
              <span className="text-sm font-normal text-muted-foreground">
                / 160 g
              </span>
            </p>
            <Progress value={75} aria-label="단백질 목표 예제" />
            <p className="mt-2 caption">
              미설정 목표는 진행률 대신 안내를 표시합니다.
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>운동 입력</CardTitle>
            <CardDescription>
              소수 중량과 정수 횟수를 입력해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                toast.success(`예제 입력 확인: ${weight} kg × ${reps}회`, {
                  description: '실제 기록은 저장하지 않았습니다.',
                });
              }}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="demo-name" className="mb-2 block font-medium">
                    운동 이름
                  </label>
                  <Input
                    id="demo-name"
                    defaultValue="Bench Press"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="demo-date" className="mb-2 block font-medium">
                    운동일
                  </label>
                  <DatePicker
                    id="demo-date"
                    defaultValue="2026-09-27"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="demo-weight"
                    className="mb-2 block font-medium"
                  >
                    중량 (kg)
                  </label>
                  <NumberInput
                    id="demo-weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    min="0"
                    max="99999.99"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="demo-reps" className="mb-2 block font-medium">
                    횟수
                  </label>
                  <NumberInput
                    id="demo-reps"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    min="1"
                    step="1"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  <Check aria-hidden="true" />
                  예제 확인
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setWeight('80');
                    setReps('8');
                  }}
                >
                  값 초기화
                </Button>
                <Button type="button" disabled>
                  저장 준비 중
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>검색과 탭</CardTitle>
            <CardDescription>
              키보드 방향키로 탭을 이동할 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="strength">
              <TabsList aria-label="운동 종류">
                <TabsTrigger value="strength">웨이트</TabsTrigger>
                <TabsTrigger value="cardio">유산소</TabsTrigger>
              </TabsList>
              <TabsContent value="strength" className="pt-4">
                <label htmlFor="demo-search" className="mb-2 block font-medium">
                  운동 검색
                </label>
                <SearchInput
                  id="demo-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="예: Squat"
                />
                {results.length ? (
                  <ul aria-label="검색 결과" className="mt-3 divide-y">
                    {results.map((name) => (
                      <li key={name} className="flex items-center gap-3 py-3">
                        <Dumbbell
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                        {name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={<Search className="size-5" />}
                    title="검색 결과가 없어요"
                    description="다른 운동 이름으로 검색해보세요."
                  />
                )}
              </TabsContent>
              <TabsContent value="cardio" className="py-6">
                <p>러닝 · 걷기 · 줄넘기</p>
                <p className="mt-2 text-muted-foreground">
                  시간을 기본으로, 종목에 따라 거리나 횟수를 입력합니다.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Dialog · Bottom Sheet · Toast</CardTitle>
          <CardDescription>
            닫으면 실행 버튼으로 포커스가 돌아옵니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">다이얼로그 열기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>운동 기록 확인</DialogTitle>
                <DialogDescription>
                  공통 다이얼로그 예제입니다. Escape 키로 닫을 수 있어요.
                </DialogDescription>
              </DialogHeader>
              <p>입력한 기록을 확인하고 다음 동작을 선택하는 공간입니다.</p>
              <DialogClose asChild>
                <Button>확인</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
          <BottomSheet
            trigger={
              <Button variant="outline">
                <Plus aria-hidden="true" />
                시트 열기
              </Button>
            }
            title="식단 빠른 입력"
            description="모바일 입력 화면의 예제입니다."
          >
            <label htmlFor="sheet-note" className="mb-2 block font-medium">
              식단 메모
            </label>
            <Input id="sheet-note" placeholder="어떤 음식을 드셨나요?" />
          </BottomSheet>
          <Button
            variant="secondary"
            onClick={() =>
              toast.success('예제 알림입니다', {
                description: '실제 기록은 저장하지 않았습니다.',
              })
            }
          >
            알림 보기
          </Button>
          <Button
            variant="destructive"
            onClick={() =>
              toast.error('예제 오류 안내', {
                description: '입력한 내용을 확인하고 다시 시도해주세요.',
              })
            }
          >
            오류 알림 보기
          </Button>
        </CardContent>
      </Card>
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>빈 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Dumbbell className="size-6" />}
              title="아직 운동 기록이 없어요"
              description="첫 운동을 마치면 기록을 여기에서 볼 수 있어요."
            />
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>불러오는 상태</CardTitle>
          </CardHeader>
          <CardContent
            aria-busy="true"
            aria-label="기록 불러오는 중"
            className="space-y-4"
          >
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <span className="sr-only">기록을 불러오는 중입니다.</span>
          </CardContent>
        </Card>
      </section>
      <section>
        <h2 className="mb-4">색상과 글자</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {[
            'background',
            'surface',
            'primary',
            'secondary',
            'muted',
            'success',
            'warning',
            'danger',
            'border',
            'brand',
          ].map((token) => (
            <div key={token}>
              <div
                className="h-12 rounded-lg border"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <p className="mt-2 caption">{token}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          <h2>꾸준함을 남기는 기록</h2>
          <p className="text-base">
            본문 16px · 운동과 식단, 나의 변화를 한눈에
          </p>
          <p>본문 14px · 빠르고 편안하게 입력하세요.</p>
          <p className="caption">Caption 12px · 보조 정보와 단위</p>
        </div>
      </section>
    </div>
  );
}
