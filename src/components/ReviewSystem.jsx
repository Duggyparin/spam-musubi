import { useState, useEffect } from "react";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, orderBy, limit, getDocs, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";

const ReviewSystem = ({ productId, productName, orderId, onClose }) => {
  const [reviews, setReviews] = useState([]);
  const [topReviews, setTopReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  
  const currentUser = auth.currentUser;
  
  // Cloudinary config
  const CLOUD_NAME = "dvbbusgra";
  const UPLOAD_PRESET = "spam_musubi_preset";

  // Fetch reviews
  useEffect(() => {
    fetchReviews();
    checkIfUserReviewed();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("productId", "==", productId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const allReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(allReviews);
      
      // Get top 2 highest-rated reviews
      const sortedByRating = [...allReviews].sort((a, b) => b.rating - a.rating);
      setTopReviews(sortedByRating.slice(0, 2));
      
      // Calculate stats
      const total = allReviews.length;
      const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
      setAverageRating(total > 0 ? (sum / total).toFixed(1) : 0);
      setTotalReviews(total);
      
      // Calculate breakdown
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      allReviews.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) breakdown[r.rating]++;
      });
      setRatingBreakdown(breakdown);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const checkIfUserReviewed = async () => {
    if (!currentUser) return;
    try {
      const reviewsRef = collection(db, "reviews");
      const q = query(reviewsRef, where("userId", "==", currentUser.uid), where("orderId", "==", orderId));
      const snapshot = await getDocs(q);
      setHasReviewed(!snapshot.empty);
    } catch (error) {
      console.error("Error checking review:", error);
    }
  };

  const uploadImage = () => {
    if (!window.cloudinary) {
      alert("Cloudinary widget not loaded. Please refresh the page.");
      return;
    }
    setUploading(true);
    window.cloudinary.openUploadWidget(
      {
        cloudName: CLOUD_NAME,
        uploadPreset: UPLOAD_PRESET,
        sources: ["local", "camera"],
        cropping: true,
        multiple: true,
        maxFileSize: 5000000,
      },
      async (error, result) => {
        setUploading(false);
        if (error) {
          console.error(error);
          alert("Upload failed.");
          return;
        }
        if (result && result.event === "success") {
          const imageUrl = result.info.secure_url;
          setImages(prev => [...prev, imageUrl]);
        }
      }
    );
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!currentUser) {
      alert("Please login to leave a review");
      return;
    }
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    if (!comment.trim()) {
      alert("Please write a review");
      return;
    }
    if (hasReviewed) {
      alert("You have already reviewed this order");
      return;
    }

    try {
      const reviewData = {
        productId,
        productName,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Customer",
        userEmail: currentUser.email,
        rating,
        comment: comment.trim(),
        images,
        orderId,
        createdAt: new Date().toISOString(),
        helpful: 0
      };
      
      await addDoc(collection(db, "reviews"), reviewData);
      alert("Review submitted! Thank you for your feedback.");
      setRating(0);
      setComment("");
      setImages([]);
      fetchReviews();
      checkIfUserReviewed();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  const StarRating = ({ value, onChange, onHover, size = "text-2xl" }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => onHover(star)}
            onMouseLeave={() => onHover(0)}
            className={`${size} ${star <= (hoverRating || value) ? "text-yellow-400" : "text-gray-600"} transition-colors`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  // Render star summary
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? "text-yellow-400" : "text-gray-600"}>★</span>
        ))}
      </div>
    );
  };

  // Main component render
  if (showAllReviews) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto">
        <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-3xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-amber-400">📝 All Reviews ({totalReviews})</h2>
            <button onClick={() => setShowAllReviews(false)} className="text-white/40 hover:text-white text-2xl">✕</button>
          </div>
          
          {/* Rating Summary */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-5xl font-black text-amber-400">{averageRating}</div>
                <div className="flex justify-center mt-1">{renderStars(Math.round(averageRating))}</div>
                <div className="text-white/40 text-xs mt-1">{totalReviews} reviews</div>
              </div>
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map(star => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-white/60 text-xs w-3">{star}★</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${totalReviews ? (ratingBreakdown[star] / totalReviews) * 100 : 0}%` }} />
                    </div>
                    <span className="text-white/40 text-xs">{ratingBreakdown[star]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reviews List */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-white/40">No reviews yet</div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center">
                      <span className="text-amber-400 font-bold">{review.userName?.[0] || "U"}</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{review.userName}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-white/30 text-xs">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mb-3">{review.comment}</p>
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.images.map((img, idx) => (
                        <img key={idx} src={img} alt="Review" className="w-20 h-20 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-black text-amber-400">⭐ Customer Reviews</h3>
        {totalReviews > 2 && (
          <button onClick={() => setShowAllReviews(true)} className="text-xs text-amber-400 hover:text-amber-300">
            See all {totalReviews} reviews →
          </button>
        )}
      </div>
      
      {/* Rating Summary */}
      {totalReviews > 0 && (
        <div className="bg-white/5 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black text-amber-400">{averageRating}</div>
              <div className="flex justify-center mt-1">{renderStars(Math.round(averageRating))}</div>
              <div className="text-white/40 text-xs">{totalReviews} reviews</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/60">5★</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(ratingBreakdown[5] / totalReviews) * 100}%` }} />
                </div>
                <span className="text-white/40 text-xs">{ratingBreakdown[5]}</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="text-white/60">4★</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(ratingBreakdown[4] / totalReviews) * 100}%` }} />
                </div>
                <span className="text-white/40 text-xs">{ratingBreakdown[4]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Reviews */}
      {topReviews.length > 0 && (
        <div className="space-y-3 mb-4">
          {topReviews.map((review) => (
            <div key={review.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                  <span className="text-amber-400 text-sm font-bold">{review.userName?.[0] || "U"}</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{review.userName}</p>
                  <div className="flex items-center gap-1">
                    {renderStars(review.rating)}
                  </div>
                </div>
              </div>
              <p className="text-white/70 text-sm line-clamp-2">{review.comment}</p>
              {review.images && review.images.length > 0 && (
                <div className="flex gap-1 mt-2">
                  <img src={review.images[0]} alt="Review" className="w-12 h-12 object-cover rounded" />
                  {review.images[1] && <img src={review.images[1]} alt="Review" className="w-12 h-12 object-cover rounded" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Write Review Section - Only show if order is completed and not reviewed yet */}
      {!hasReviewed && orderId && (
        <div className="border-t border-white/10 pt-4 mt-2">
          <h4 className="text-white font-bold mb-3">Write a Review</h4>
          <div className="mb-3">
            <StarRating value={rating} onChange={setRating} onHover={setHoverRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 focus:border-amber-400 focus:outline-none text-white text-sm resize-none"
            rows="3"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative">
                <img src={img} alt="Upload" className="w-16 h-16 object-cover rounded-lg" />
                <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs">✕</button>
              </div>
            ))}
            <button
              onClick={uploadImage}
              disabled={uploading}
              className="w-16 h-16 rounded-lg bg-white/10 border border-dashed border-white/30 flex items-center justify-center text-white/40 hover:text-amber-400 hover:border-amber-400 transition-all"
            >
              {uploading ? "⏳" : "📷"}
            </button>
          </div>
          <button
            onClick={submitReview}
            className="mt-3 px-6 py-2 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 transition-all text-sm"
          >
            Submit Review
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewSystem;