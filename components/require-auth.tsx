import { useSession } from "next-auth/react";
import { ReactNode, useState } from "react";
import { AuthDialog } from "./auth-dialog";
import React from "react";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { data: session } = useSession();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  if (session) {
    return <>{children}</>;
  }

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAuthDialog(true);
  };

  // 克隆子元素并添加点击事件处理
  const child = React.Children.only(children as React.ReactElement);
  const childWithHandler = React.cloneElement(child, {
    onClick: handleAction,
    className: `${child.props.className} cursor-pointer`
  });

  return (
    <>
      {childWithHandler}
      <AuthDialog 
        isOpen={showAuthDialog} 
        onClose={() => setShowAuthDialog(false)} 
      />
    </>
  );
} 