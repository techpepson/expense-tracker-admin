import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, ShieldCheck, User as UserIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  errorMessage,
  useCreateUser,
  useUpdateUser,
  useUsers,
} from '@/api'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, OptionCard } from '@/components/ui/badge'
import { FormField, PageHeader, UserChip } from '@/components/shared'

const createUserSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters'),
  role: z.enum(['employee', 'admin']),
  can_record_shared: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

const editUserSchema = createUserSchema.extend({
  password: z.string().optional(),
})

type UserFormValues = z.infer<typeof createUserSchema>

export function UserFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  const { data: users } = useUsers()
  const existing = users?.find((u) => u.id === id)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const isSelf = isEdit && Boolean(currentUser && existing && currentUser.id === existing.id)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEdit ? editUserSchema : createUserSchema) as any,
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'employee',
      can_record_shared: false,
      is_active: true,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        full_name: existing.full_name,
        email: existing.email,
        password: '',
        role: existing.role,
        can_record_shared: existing.can_record_shared,
        is_active: existing.is_active,
      })
    }
  }, [existing, reset])

  const fullNameVal = useWatch({ control, name: 'full_name' })
  const emailVal = useWatch({ control, name: 'email' })
  const roleVal = useWatch({ control, name: 'role' })
  const sharedVal = useWatch({ control, name: 'can_record_shared' })
  const activeVal = useWatch({ control, name: 'is_active' })

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && id) {
        const { password: _p, ...rest } = values
        await updateUser.mutateAsync({ id, ...rest })
        toast.success('User updated')
      } else {
        await createUser.mutateAsync(values)
        toast.success('User created')
      }
      navigate('/users')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
      </div>

      <PageHeader
        title={isEdit ? 'Edit User' : 'Add User'}
        subtitle="Configure role, designated shared expense recording permissions, and account status"
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <form onSubmit={onSubmit} noValidate className="app-card lg:col-span-8 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Full name"
              htmlFor="user-name"
              required
              error={errors.full_name?.message}
            >
              <Input id="user-name" placeholder="e.g. Efua Boateng" {...register('full_name')} />
            </FormField>

            <FormField
              label="Email address"
              htmlFor="user-email"
              required
              error={errors.email?.message}
            >
              <Input
                id="user-email"
                type="email"
                placeholder="efua@ecom.com"
                {...register('email')}
              />
            </FormField>
          </div>

          {!isEdit && (
            <FormField
              label="Temporary password"
              htmlFor="user-password"
              required
              hint="Minimum 8 characters. Share this temporary password securely with the user."
              error={errors.password?.message}
            >
              <Input
                id="user-password"
                type="password"
                placeholder="At least 8 characters"
                {...register('password')}
              />
            </FormField>
          )}

          <FormField
            label="Role"
            required
            hint={isSelf ? 'You cannot demote your own administrator account.' : undefined}
          >
            <div role="radiogroup" aria-label="User role" className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                selected={roleVal === 'employee'}
                onSelect={() => !isSelf && setValue('role', 'employee')}
                disabled={isSelf}
                title="Employee"
                description="Signs in on the employee site to record personal or designated shared expenses."
                icon={<UserIcon className="h-4 w-4 text-[#2563EB]" />}
              />
              <OptionCard
                selected={roleVal === 'admin'}
                onSelect={() => setValue('role', 'admin')}
                title="Administrator"
                description="Full access to this admin portal: users, catalog, all expenses, petty cash & reports."
                icon={<ShieldCheck className="h-4 w-4 text-[#2563EB]" />}
              />
            </div>
          </FormField>

          <div className="space-y-3">
            <OptionCard
              role="checkbox"
              selected={sharedVal}
              onSelect={() => setValue('can_record_shared', !sharedVal)}
              title="Designated expense recorder"
              description="Allows this user to record shared operational expenses and petty cash disbursements on the employee app."
            />

            <OptionCard
              role="checkbox"
              selected={activeVal}
              onSelect={() => !isSelf && setValue('is_active', !activeVal)}
              disabled={isSelf}
              title="Active account"
              description={
                isSelf
                  ? 'You cannot deactivate your own administrator account.'
                  : 'When unchecked, sign-in is blocked immediately while all historical records are preserved.'
              }
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-divider)] pt-4">
            <Button variant="outline" asChild>
              <Link to="/users">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </form>

        {/* Side Card: Live Preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="app-card space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Live user preview
            </div>

            <div className="rounded-[12px] bg-[var(--surface-tint)] p-4 space-y-3">
              <UserChip
                name={fullNameVal.trim() || 'Full Name'}
                email={emailVal.trim() || 'user@ecom.com'}
                avatarUrl={existing?.profile_picture}
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant={roleVal === 'admin' ? 'admin' : 'employee'}>
                  {roleVal === 'admin' ? 'Admin' : 'Employee'}
                </Badge>
                {sharedVal && <Badge variant="shared">Shared recorder</Badge>}
                <Badge variant={activeVal ? 'active' : 'inactive'}>
                  {activeVal ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
              <span>
                Deactivating an account blocks sign-in immediately and revokes active tokens, but keeps every past expense and petty cash record attributed to the user.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

