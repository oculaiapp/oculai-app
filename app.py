import streamlit as st
import torch
from torchvision import transforms
from PIL import Image
import requests

# Load the model
@st.cache_resource
def load_model():
    model = torch.load("model.pth")  # Replace with your Hugging Face link if needed
    model.eval()
    return model

model = load_model()

# Define preprocessing transformations
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),  # Adjust size based on your model's input
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    return transform(image).unsqueeze(0)

# Prediction function
def predict(image):
    with torch.no_grad():
        outputs = model(image)
        probabilities = torch.nn.functional.softmax(outputs, dim=1).squeeze().tolist()
        return probabilities

# Streamlit UI
st.title("SMART Scanner: Diabetic Retinopathy Detection")
st.subheader("Upload or capture a fundus image to analyze its severity level.")

# Image upload or capture options
uploaded_file = st.file_uploader("Upload Fundus Image", type=["jpg", "png", "jpeg"])
camera_image = st.camera_input("Capture Fundus Image")

if uploaded_file or camera_image:
    # Load the image
    img = Image.open(uploaded_file if uploaded_file else camera_image)
    st.image(img, caption="Uploaded Image", use_column_width=True)

    # Preprocess and predict
    input_tensor = preprocess_image(img)
    probabilities = predict(input_tensor)

    # Map stages to labels
    stages = ["No DR (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Proliferative DR (4)"]
    prediction = stages[probabilities.index(max(probabilities))]

    # Display results
    st.markdown(f"### Predicted Stage: {prediction}")
    st.markdown("### Probabilities:")
    for stage, prob in zip(stages, probabilities):
        st.write(f"{stage}: {prob * 100:.2f}%")
