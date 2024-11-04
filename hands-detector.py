import cv2
import mediapipe as mp
import numpy as np

class HandDetector:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=0  # Use simpler model for faster performance
        )

    def process_frame(self, frame):
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.hands.process(frame_rgb)
        
        hand_detected = False
        # Detect hands and Draw landmarks
        if results.multi_hand_landmarks:
            hand_detected = True
            status = "DANGER!"
            color = (0, 0, 255)
            cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
            for landmarks in results.multi_hand_landmarks:
                self.mp_drawing.draw_landmarks(
                    frame,
                    landmarks,
                    self.mp_hands.HAND_CONNECTIONS
                )
        
        return hand_detected, frame

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
        hand_detected, frame = detector.process_frame(frame)

        # Display frame
        cv2.imshow('Hand Detection', frame)

        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()