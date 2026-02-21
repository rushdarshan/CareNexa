declare module 'react-webcam' {
    import { Component, RefObject } from 'react';

    interface WebcamProps {
        audio?: boolean;
        className?: string;
        height?: number | string;
        width?: number | string;
        mirrored?: boolean;
        screenshotFormat?: string;
        videoConstraints?: MediaStreamConstraints['video'];
        ref?: RefObject<Webcam>;
        [key: string]: any;
    }

    export default class Webcam extends Component<WebcamProps> {
        video: HTMLVideoElement | null;
        getScreenshot(): string | null;
    }
}

declare module '@mediapipe/pose' {
    export interface NormalizedLandmark {
        x: number;
        y: number;
        z: number;
        visibility?: number;
    }

    export interface Results {
        poseLandmarks?: NormalizedLandmark[];
        poseWorldLandmarks?: NormalizedLandmark[];
        segmentationMask?: ImageData;
        image: HTMLCanvasElement;
    }

    export interface PoseOptions {
        modelComplexity?: 0 | 1 | 2;
        smoothLandmarks?: boolean;
        enableSegmentation?: boolean;
        smoothSegmentation?: boolean;
        minDetectionConfidence?: number;
        minTrackingConfidence?: number;
    }

    export interface PoseConfig {
        locateFile?: (file: string) => string;
    }

    export const POSE_LANDMARKS: {
        NOSE: number;
        LEFT_EYE_INNER: number;
        LEFT_EYE: number;
        LEFT_EYE_OUTER: number;
        RIGHT_EYE_INNER: number;
        RIGHT_EYE: number;
        RIGHT_EYE_OUTER: number;
        LEFT_EAR: number;
        RIGHT_EAR: number;
        MOUTH_LEFT: number;
        MOUTH_RIGHT: number;
        LEFT_SHOULDER: number;
        RIGHT_SHOULDER: number;
        LEFT_ELBOW: number;
        RIGHT_ELBOW: number;
        LEFT_WRIST: number;
        RIGHT_WRIST: number;
        LEFT_PINKY: number;
        RIGHT_PINKY: number;
        LEFT_INDEX: number;
        RIGHT_INDEX: number;
        LEFT_THUMB: number;
        RIGHT_THUMB: number;
        LEFT_HIP: number;
        RIGHT_HIP: number;
        LEFT_KNEE: number;
        RIGHT_KNEE: number;
        LEFT_ANKLE: number;
        RIGHT_ANKLE: number;
        LEFT_HEEL: number;
        RIGHT_HEEL: number;
        LEFT_FOOT_INDEX: number;
        RIGHT_FOOT_INDEX: number;
    };

    export class Pose {
        constructor(config?: PoseConfig);
        setOptions(options: PoseOptions): void;
        onResults(callback: (results: Results) => void): void;
        send(inputs: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
        close(): Promise<void>;
    }
}

declare module '@mediapipe/camera_utils' {
    export interface CameraOptions {
        onFrame: () => Promise<void>;
        width?: number;
        height?: number;
        facingMode?: string;
    }

    export class Camera {
        constructor(videoElement: HTMLVideoElement, options: CameraOptions);
        start(): Promise<void>;
        stop(): void;
    }
}
