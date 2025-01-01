import streamlit as st
import torch
from torchvision import transforms, models
from PIL import Image
import requests
import io

# Custom CSS for styling
st.markdown(
    """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap');
        
        body {
            background-color: #0e1117;
            color: white;
            font-family: 'DM Sans', sans-serif;
        }
        h1, h2, h3 {
            text-align: center;
            color: #32CD32;
            animation: fadeIn 2s ease-in-out;
        }
        .stButton>button {
            background-color: #32CD32;
            color: white;
            border-radius: 10px;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            margin: 5px;
            transition: background-color 0.3s ease-in-out;
        }
        .stButton>button:hover {
            background-color: #228B22;
        }
        .stProgress > div > div {
            background-image: linear-gradient(90deg, #32CD32, #228B22);
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# Load the model from Hugging Face
@st.cache_resource
def load_model():
    # Download the model file from Hugging Face
    url = "https://huggingface.co/oculotest/smart-scanner-model/resolve/main/ss_model.pth"
    response = requests.get(url)
    response.raise_for_status()  # Ensure download was successful

    # Load pretrained ResNet18 and adjust for our task
    model = models.resnet18(pretrained=True)
    model.fc = torch.nn.Linear(model.fc.in_features, 5)  # Adjust output layer for 5 classes

    # Load state_dict into the model
    state_dict = torch.load(io.BytesIO(response.content), map_location=torch.device("cpu"))
    model.load_state_dict(state_dict)
    model.eval()  # Set to evaluation mode
    return model

model = load_model()

# Define preprocessing transformations with data augmentation
def preprocess_image(image):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
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

# Streamlit UI Design
st.title("SMART Scanner")
st.subheader("One Model, Countless Diseases")

# Toggle for input method (upload or capture)
input_method = st.radio("Choose Input Method", ("Upload Image", "Capture from Camera"))

img = None

if input_method == "Upload Image":
    uploaded_file = st.file_uploader("Upload Eye Image", type=["jpg", "png", "jpeg"])
    if uploaded_file:
        img = Image.open(uploaded_file)
elif input_method == "Capture from Camera":
    camera_image = st.camera_input("Capture Eye Image")
    if camera_image:
        img = Image.open(camera_image)

if img:
    with st.spinner("Analyzing..."):
        st.image(img, caption="Selected Image", use_column_width=True)

        # Preprocess and predict
        input_tensor = preprocess_image(img)
        probabilities = predict(input_tensor)

        # Map stages to labels
        stages = ["No DR (0)", "Mild (1)", "Moderate (2)", "Severe (3)", "Proliferative DR (4)"]
        prediction = stages[probabilities.index(max(probabilities))]

        # Display results in a styled format
        st.markdown(f"<h3>Predicted Stage: {prediction}</h3>", unsafe_allow_html=True)
        
        st.markdown("<h3>Probabilities:</h3>", unsafe_allow_html=True)
        
        for stage, prob in zip(stages, probabilities):
            st.write(f"{stage}: {prob * 100:.2f}%")
            st.progress(prob)
else:
    st.info("Please upload or capture an eye image to proceed.")
