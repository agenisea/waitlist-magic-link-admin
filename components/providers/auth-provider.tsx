'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface AuthState {
  authenticated: boolean
  roleId: number | null
  displayName: string | null
}

const defaultAuthState: AuthState = {
  authenticated: false,
  roleId: null,
  displayName: null,
}

const AuthContext = createContext<AuthState>(defaultAuthState)

export function AuthProvider({ value, children }: { value: AuthState; children: ReactNode }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthState(): AuthState {
  return useContext(AuthContext)
}
