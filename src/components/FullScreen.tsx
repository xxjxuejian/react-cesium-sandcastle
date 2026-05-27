import { FullscreenOutlined, FullscreenExitOutlined } from "@ant-design/icons";
import { Tooltip, Button } from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export function FullScreen() {
  const { t } = useTranslation();
  const [isFullScreen, setIsFullScreen] = useState(false);

  /* 
  思路：这个组件第一次渲染时，就需要知道当前是否处于全屏状态
  通过
  用户不一定只通过点击按钮进入全屏，也可以通过快捷键进入全屏
  比如：F11，Esc
  不能仅仅通过点击按钮时，执行全屏或者退出全屏的逻辑
  */

  useEffect(() => {
    // 这个函数的定义就应该放在这里，因为只会在组件挂载后执行一次，只会定义一次
    // 如果放在组件函数体里：每次组件渲染都会创建一个新的函数。
    const handleFullscreenChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // 如果组件以后被卸载，比如 Header 不再显示，就要移除监听，避免内存泄漏或者重复回调。
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
    // 空依赖数组 []: 仅首次挂载执行一次
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  // 根据 isFullscreen 切换图标和文案：
  const title = isFullScreen
    ? t("header.exitFullscreen")
    : t("header.fullScreen");

  return (
    <Tooltip title={title}>
      <Button
        type="text"
        icon={
          isFullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
        }
        aria-label={t("header.fullScreen")}
        onClick={toggleFullscreen}
      />
    </Tooltip>
  );
}
