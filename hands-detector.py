import cv2
import mediapipe as mp
import numpy as np

class HandDetector:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def process_frame(self, frame):
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.hands.process(frame_rgb)
        
        # Draw landmarks
        if results.multi_hand_landmarks:
            for landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    landmarks,
                    self.mp_hands.HAND_CONNECTIONS
                )
        
        return frame

def main():
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    detector = HandDetector()

    while cap.isOpened():
        # Read frame
        success, frame = cap.read()
        if not success:
            print("Failed to read frame")
            break

        # Process frame
        frame = detector.process_frame(frame)

        # Display frame
        cv2.imshow('Hand Detection', frame)

        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()