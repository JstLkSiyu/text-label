import { MutableRefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { TextLabel, TextLabelScope, TextLabelScopeConfig } from './text-label';

type Color = {
  r: number;
  g: number;
  b: number;
};

export const useTextLabel = (bindRef: MutableRefObject<HTMLElement>, initConfig?: TextLabelScopeConfig) => {
  const scopeRef = useRef<TextLabelScope>();
  useEffect(() => {
    scopeRef.current = new TextLabelScope(bindRef.current, initConfig ?? {});
    return () => {
      scopeRef.current?.clearEnv();
      scopeRef.current = undefined;
    }
  }, [bindRef.current]);
  const deleteLabel = useCallback((label: TextLabel) => {
    scopeRef.current?.deleteLabel(label);
  }, []);
  const doLabel = useCallback(() => {
    if (initConfig?.labelDirectory === false) {
      scopeRef.current?.label();
    }
  }, []);
  const setColor = useCallback((color: Color) => {
    scopeRef.current?.useColor(color);
  }, []);
  const getSelectingLabel = useCallback(() => {
    return scopeRef.current?.getSelectingLabel() ?? null;
  }, []);
  return {
    doLabel,
    deleteLabel,
    setColor,
    getSelectingLabel,
  };
}