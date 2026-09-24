import { useEffect, useState, type RefObject } from 'react';

export type CameraState = 'idle' | 'starting' | 'ready' | 'denied' | 'error' | 'unsupported';

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean, deviceId: string) {
  const [state, setState] = useState<CameraState>('idle');
  const [aspect, setAspect] = useState(16 / 9);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    setState('starting');

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      })
      .then(async (s) => {
        if (cancelled || !video) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play().catch(() => undefined);
        if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);
        setState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[qoldau] camera error', err);
        const name = err instanceof DOMException ? err.name : '';
        setState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [enabled, deviceId, videoRef]);

  return { state, aspect };
}

export function useVideoDevices(): MediaDeviceInfo[] {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const media = navigator.mediaDevices;
    if (!media?.enumerateDevices) return;
    const update = () =>
      media
        .enumerateDevices()
        .then((list) => setDevices(list.filter((d) => d.kind === 'videoinput' && d.deviceId)))
        .catch(() => setDevices([]));
    update();
    media.addEventListener('devicechange', update);
    return () => media.removeEventListener('devicechange', update);
  }, []);
  return devices;
}
