const Post = require("../models/Post");
const User = require("../models/User");
const {sendEmail} = require("../middlewares/sendemail");
const crypto = require("crypto");

exports.createPost = async (req,res) => {

    try {
        const newPostData = {
            caption:req.body.caption,
            image:{
                public_id:"req.body.public_id",
                url:"req.body.url"
            },
            owner:req.user._id ,
        }
        // updating in posts model
        const post = await Post.create(newPostData);

        // updating in users posts

        const user = await User.findById(req.user._id);
        user.posts.push(post._id);
        await user.save();
        

        res.status(201).json({
            success: true,
            post ,
        });

    } catch (error) {
        res.this.status(500).json({
            success:false,
            message:error.messsage,

        })
    }
};
exports.deletePost = async (req,res) => {

    try {
        
        const post = await Post.findById(req.params.id);         

        if(!post){
            return res.status(404).json({
                success:false,
                message:"post not found",
            });
        }

        if(post.owner.toString() !== req.user._id.toString()){
            return res.status(401).json({
                success: false,
                message: "unauthorized"
            });
        }

        await Post.findByIdAndDelete(req.params.id); 

        const user = await User.findById(req.user._id);
        const index = user.posts.indexOf(req.params.id);
        user.posts.splice(index,1);
        user.save();


        res.status(200).json({
            success:true,
            message: "post deleted",
        })


    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message,
        });
    }

}



exports.likeAndUnlikePost = async (req,res) => {
    try {
        
        const post = await Post.findById(req.params.id);         

        if(!post){
            return res.status(404).json({
                success:false,
                message:"post not found",
            });
        }
       

        if (post.likes.includes(req.user._id)) {
            const index = post.likes.indexOf(req.user._id);

            post.likes.splice(index, 1);

            await post.save();

            return res.status(200).json({
                success: true,
                message:"post Unliked",
            });
        }
        else{
            
            post.likes.push(req.user._id);

            await post.save();

            return res.status(200).json({
                success: true,
                message: "post Liked",
            })
            
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.commentOnPost = async (req,res) => {
    try {

        const post = await Post.findById(req.params.id);

        if(!post) {
            return res.status(404).json({
                success:false,
                message:"Post not Found",
            });
        }

        let commentindex = -1;

        post.comments.forEach((item,index)=>  {
            if(item.user.toString() === req.user._id.toString()){
                commentindex=index;
            }
        });

        if(commentindex !== -1){
            post.comments[commentindex].comment = req.body.comment;

            post.save();

            return res.status(200).json({
                success:true,
                message:"comment updated",
            });
        }
        else{
           
            const comment = req.body.comment;
            post.comments.push({
                user:req.user._id,
                comment:comment,
            });
           
            await post.save();
    
            return res.status(200).json({
                success: true,
                message:"comment added",
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.deleteComment = async (req,res) => {
    try {

        const post = await Post.findById(req.params.id);

        if(!post){
            return res.status(404).json({
                success:false,
                message:"post not found",
            })
        }


        // checking if ownwer wants to delete
        if(post.owner.toString() === req.user._id.toString()){

            if(req.body.commentId == undefined) {
                return res.status(400).json({
                    success:false,
                    message:"comment Id is required ",
                })
            }

            post.comments.forEach((item,index)=>  {
                if(item._id.toString() === req.body.commentId.toString()){
                    post.comments.splice(index,1);
                }
            });
            await post.save();

            return res.status(200).json({
                success:true,
                message:"selected comment has deleted",
            })

        }else{
            
            post.comments.forEach((item,index)=>  {
                if(item.user.toString() === req.user._id.toString()){
                    post.comments.splice(index,1);
                    
                }

            });
           
            

            await post.save();

            res.status(200).json({
                success:true,
                message: "comment deleted"
            })
            
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.forgotPassword = async (req,res) => {
    try {

        const user = await User.findOne({email:req.body.email});

        if(!user){
            return res.status(404).json({
                success:false,
                message:"user not found",
            })
        }

        const resetPasswordToken = user.getResetPasswordToken();

        await user.save();

        const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/password/reset/${resetPasswordToken}`;
        
        const message =`Reset Your Password by clicking on the link below: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email:user.email,
                subject:"Reset Password",
                message,
            });

            res.status(200).json({
                success:true,
                message: `email sent to ${user.email}`,
            });
        } catch (error) {

           user.resetPasswordToken = undefined;
           user.resetPasswordExpire = undefined;
           await user.save();

           res.status(500).json({
            success: false,
            message: error.message,
           })
            
        }


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


exports.resetPassword = async (req,res) => {

    try {
        
        const resetPasswordToken = crypto
            .createHash("sha256")
            .update(req.params.token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt : Date.now() },
        });

        if(!user){
            return res.status(401).json({
                success: false,
                message: "token is invalid or has expired ",
            });
        }

        user.password= req.body.password;

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({
            success:true,
            message: "password updated"
        })



    } catch (error) {
         res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

