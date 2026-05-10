import React, { createContext, useContext, useState, useEffect } from 'react';

const RoleContext = createContext(null);

export const ROLES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
};

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    return localStorage.getItem('fresh_user_role') || ROLES.PERSONAL;
  });

  function setRole(newRole) {
    localStorage.setItem('fresh_user_role', newRole);
    setRoleState(newRole);
  }

  function isPersonal() {
    return role === ROLES.PERSONAL;
  }

  function isBusiness() {
    return role === ROLES.BUSINESS;
  }

  return (
    <RoleContext.Provider value={{ role, setRole, isPersonal, isBusiness, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
