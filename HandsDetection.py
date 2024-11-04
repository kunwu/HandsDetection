import cv2
import mediapipe as mp
import numpy as np
from typing import List, Dict, Tuple
import dataclasses
from dataclasses import dataclass
import math

@dataclass
class HandDetectorConfig:
    max_num_hands: int = 2
    model_complexity: int = 1
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.5
    static_image_mode: bool = False

@dataclass
class GestureThresholds:
    pinch_threshold: float = 0.1
    grab_threshold: float = 0.3
    point_threshold: float = 0.15

class HandDetector:
    def __init__(self, config: HandDetectorConfig = None):
        self.config = config or HandDetectorConfig()
        self.gesture_thresholds = GestureThresholds()
        
        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.hands = self.mp_hands.Hands(
            static_image_mode=self.config.static_image_mode,
            max_num_hands=self.config.max_num_hands,
            model_complexity=self.config.model_complexity,
            min_detection_confidence=self.config.min_detection_confidence,
            min_tracking_confidence=self.config.min_tracking_confidence
        )
        
        # Performance metrics
        self.fps_calculator = FPSCalculator()
        
    def process_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict]]:
        """Process a single frame and return the annotated frame and detected gestures."""
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.hands.process(frame_rgb)
        
        # Draw landmarks and get gestures
        annotated_frame = frame.copy()
        gestures = []
        
        if results.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, 
                                                results.multi_handedness):
                # Draw landmarks
                self.draw_landmarks(annotated_frame, hand_landmarks)
                
                # Detect gestures
                landmarks_array = self.landmarks_to_array(hand_landmarks)
                gesture = self.detect_gestures(landmarks_array)
                gesture['handedness'] = handedness.classification[0].label
                gestures.append(gesture)
                
                # Draw gesture labels
                self.draw_gesture_labels(annotated_frame, gesture, hand_landmarks)
        
        # Add FPS counter
        fps = self.fps_calculator.get_fps()
        cv2.putText(annotated_frame, f'FPS: {fps:.1f}', (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        return annotated_frame, gestures
    
    def landmarks_to_array(self, landmarks) -> np.ndarray:
        """Convert landmarks to numpy array."""
        return np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark])
    
    def detect_gestures(self, landmarks: np.ndarray) -> Dict:
        """Detect various hand gestures."""
        gestures = {
            'isPinching': False,
            'isGrabbing': False,
            'isPointing': False,
            'fingerStates': self.get_finger_states(landmarks)
        }
        
        # Detect pinch (thumb to index)
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        pinch_distance = np.linalg.norm(thumb_tip - index_tip)
        gestures['isPinching'] = pinch_distance < self.gesture_thresholds.pinch_threshold
        
        # Detect grab (all fingers closed)
        finger_tips = landmarks[[8, 12, 16, 20]]
        palm_base = landmarks[0]
        avg_finger_distance = np.mean([np.linalg.norm(tip - palm_base) for tip in finger_tips])
        gestures['isGrabbing'] = avg_finger_distance < self.gesture_thresholds.grab_threshold
        
        # Detect pointing (index extended, others closed)
        index_extended = np.linalg.norm(landmarks[8] - landmarks[5]) > self.gesture_thresholds.point_threshold
        others_flexed = all(np.linalg.norm(landmarks[i] - landmarks[0]) < self.gesture_thresholds.point_threshold 
                          for i in [12, 16, 20])
        gestures['isPointing'] = index_extended and others_flexed
        
        return gestures
    
    def get_finger_states(self, landmarks: np.ndarray) -> Dict[str, bool]:
        """Determine which fingers are extended."""
        finger_names = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']
        finger_indices = [[4], [8], [12], [16], [20]]  # Tip indices
        base_indices = [[2], [5], [9], [13], [17]]     # Base indices
        
        states = {}
        for name, tip_idx, base_idx in zip(finger_names, finger_indices, base_indices):
            tip_pos = landmarks[tip_idx]
            base_pos = landmarks[base_idx]
            extended = np.linalg.norm(tip_pos - base_pos) > self.gesture_thresholds.point_threshold
            states[name] = extended
        
        return states
    
    def draw_landmarks(self, frame: np.ndarray, landmarks) -> None:
        """Draw hand landmarks and connections."""
        self.mp_drawing.draw_landmarks(
            frame,
            landmarks,
            self.mp_hands.HAND_CONNECTIONS,
            self.mp_drawing_styles.get_default_hand_landmarks_style(),
            self.mp_drawing_styles.get_default_hand_connections_style()
        )
    
    def draw_gesture_labels(self, frame: np.ndarray, gesture: Dict, landmarks) -> None:
        """Draw detected gesture labels."""
        h, w, _ = frame.shape
        text_pos = (int(landmarks.landmark[0].x * w), int(landmarks.landmark[0].y * h))
        
        # Create gesture label
        active_gestures = [k for k, v in gesture.items() 
                          if v is True and k not in ['fingerStates', 'handedness']]
        if active_gestures:
            label = f"{gesture['handedness']}: {', '.join(active_gestures)}"
            cv2.putText(frame, label, text_pos,
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    def update_config(self, new_config: Dict) -> None:
        """Update detector configuration."""
        self.config = dataclasses.replace(self.config, **new_config)
        self.hands = self.mp_hands.Hands(
            static_image_mode=self.config.static_image_mode,
            max_num_hands=self.config.max_num_hands,
            model_complexity=self.config.model_complexity,
            min_detection_confidence=self.config.min_detection_confidence,
            min_tracking_confidence=self.config.min_tracking_confidence
        )
    
    def update_gesture_thresholds(self, new_thresholds: Dict) -> None:
        """Update gesture detection thresholds."""
        self.gesture_thresholds = dataclasses.replace(self.gesture_thresholds, **new_thresholds)

class FPSCalculator:
    def __init__(self, buffer_size: int = 30):
        self.timestamps = []
        self.buffer_size = buffer_size
    
    def get_fps(self) -> float:
        """Calculate FPS based on timestamp buffer."""
        current_time = cv2.getTickCount() / cv2.getTickFrequency()
        self.timestamps.append(current_time)
        
        # Maintain buffer size
        if len(self.timestamps) > self.buffer_size:
            self.timestamps.pop(0)
        
        # Calculate FPS
        if len(self.timestamps) > 1:
            return len(self.timestamps) / (self.timestamps[-1] - self.timestamps[0])
        return 0.0

def main():
    # Initialize detector with custom configuration
    config = HandDetectorConfig(
        max_num_hands=2,
        model_complexity=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5
    )
    detector = HandDetector(config)
    
    # Initialize video capture
    cap = cv2.VideoCapture(0)
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break
            
        # Process frame
        annotated_frame, gestures = detector.process_frame(frame)
        
        # Display results
        cv2.imshow('MediaPipe Hands', annotated_frame)
        
        # Handle gestures
        for gesture in gestures:
            if gesture['isPinching']:
                print(f"{gesture['handedness']} hand: Pinch detected")
            if gesture['isGrabbing']:
                print(f"{gesture['handedness']} hand: Grab detected")
            if gesture['isPointing']:
                print(f"{gesture['handedness']} hand: Pointing detected")
        
        # Exit on 'q' press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()