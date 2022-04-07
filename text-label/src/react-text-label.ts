import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { TextLabel, TextLabelScope, TextLabelScopeConfig, InitLabelInfo } from './text-label';

type Color = {
  r: number;
  g: number;
  b: number;
};

export const useTextLabel = (bindRef: MutableRefObject<HTMLElement | null>, initConfig?: TextLabelScopeConfig) => {
  const scopeRef = useRef<TextLabelScope>();
  useEffect(() => {
    if (bindRef.current) {
      scopeRef.current = new TextLabelScope(bindRef.current, initConfig ?? {});
    }
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
  const getTextLabels = useCallback(() => {
    return scopeRef.current?.getTextLabels() ?? [];
  }, []);
  const createTextLabel = useCallback((labelInfo: InitLabelInfo) => {
    return scopeRef.current?.createLabel(labelInfo) ?? null;
  }, []);
  const getScope = useCallback(() => scopeRef.current ?? null, []);
  return {
    doLabel,
    deleteLabel,
    setColor,
    getSelectingLabel,
    getTextLabels,
    createTextLabel,
    getScope,
  };
}